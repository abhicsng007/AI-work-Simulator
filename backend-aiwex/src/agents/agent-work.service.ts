import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OpenAIService } from '../openai/openai.service';
import { GithubService } from '../github/github.service';
import { GithubCollaborationService } from '../github/github-collaboration.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { Message, MessageDocument } from '../database/schemas/message.schema';
import { Task, TaskDocument } from '../database/schemas/task.schema';
import { Agent, AgentDocument } from '../database/schemas/agent.schema';
import { Channel, ChannelDocument } from '../database/schemas/channel.schema';
import { ConfigService } from '@nestjs/config';
import { ProjectCreatorService } from '../projects/project-creator.service';
import { RealAgentCommunicationService } from './communication/real-agent-communication.service';
import { AgentWork } from './agent-work.interface';
import { AgentInitializationService } from './agent-initialization.service';
import { TaskExecutionService } from './task-execution.service';
import { PrReviewService } from './pr-review.service';
import { GitHubActivityService } from './github-activity.service';
import { ChatHandlerService } from './chat-handler.service';

@Injectable()
export class AgentWorkService {
  private readonly logger = new Logger(AgentWorkService.name);
  private activeWork = new Map<string, AgentWork>();
  private projectContext = new Map<string, any>();
  private workQueue: Array<{ agentId: string; taskId: string; projectId: string }> = [];
  private isProcessing = false;

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Agent.name) private agentModel: Model<AgentDocument>,
    @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>,
    private openAIService: OpenAIService,
    private githubService: GithubService,
    private githubCollabService: GithubCollaborationService,
    private websocketGateway: WebsocketGateway,
    private configService: ConfigService,
    @Inject(forwardRef(() => ProjectCreatorService))
    private projectCreatorService: ProjectCreatorService,
    public realCommunicationService: RealAgentCommunicationService,
    private agentInitializationService: AgentInitializationService,
    private taskExecutionService: TaskExecutionService,
    private prReviewService: PrReviewService,
    private githubActivityService: GitHubActivityService,
    private chatHandlerService: ChatHandlerService,// ADD THIS LINE
) {}

  // Add these methods to your AgentWorkService class:
  // Update these methods in your AgentWorkService with proper typing:

// Add method to get all agents from database with proper typing
async getAllAgentsFromDB(): Promise<any[]> {
    return this.agentInitializationService.getAllAgentsFromDB();
  }

// Add method to get all channels from database with proper typing
async getAllChannelsFromDB(): Promise<any[]> {
    return this.agentInitializationService.getAllChannelsFromDB();
  }

getWorkQueueStatus() {
  try {
    return {
      queueLength: this.workQueue.length,
      isProcessing: this.isProcessing,
      activeWork: Array.from(this.activeWork.keys()),
      projectContexts: Array.from(this.projectContext.keys()),
      hasProjectCreatorService: !!this.projectCreatorService,
      projectCreatorServiceType: this.projectCreatorService ? this.projectCreatorService.constructor.name : null,
      workQueueItems: this.workQueue.map(item => ({
        agentId: item.agentId,
        taskId: item.taskId,
        projectId: item.projectId
      })),
      availableMethods: this.projectCreatorService ? Object.getOwnPropertyNames(Object.getPrototypeOf(this.projectCreatorService)) : []
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      hasProjectCreatorService: false,
      queueLength: 0,
      isProcessing: false,
      activeWork: [],
      projectContexts: [],
      workQueueItems: []
    };
  }
}

// Update the initialization method with better error handling
async initializeAgentsAndChannels(): Promise<void> {
    return this.agentInitializationService.initializeAgentsAndChannels();
  }

async handleUserMention(
    channelId: string,
    mentionedAgentId: string,
    userMessage: string,
    userId: string,
    userName: string
  ): Promise<void> {
    return this.chatHandlerService.handleUserMention(
      channelId, mentionedAgentId, userMessage, userId, userName
    );
  }

  async handleChatMessage(
    channelId: string,
    userId: string,
    userName: string,
    message: string
  ): Promise<void> {
    return this.chatHandlerService.handleChatMessage(
      channelId, userId, userName, message
    );
  }

  // Delegate to PrReviewService
  async handleUserPRReviewRequest(
    userId: string,
    userName: string,
    userRole: string,
    repository: string,
    prNumber: number,
    description?: string,
    specificReviewers?: string[],
    channelId: string = 'general'
  ): Promise<void> {
    return this.prReviewService.handleUserPRReviewRequest(
      userId, userName, userRole, repository, prNumber, description, specificReviewers, channelId
    );
  }

  async startProjectWork(projectId: string, repository: string, tasks: any[]) {
  this.logger.log(`Starting project work for project: ${projectId}`);
  
  try {
    if (!this.projectCreatorService) {
      throw new Error('ProjectCreatorService not available - injection failed');
    }

    const projectContext = this.projectCreatorService.getProjectContext(projectId);
    if (!projectContext) {
      this.logger.warn(`Project context not found in ProjectCreatorService for project: ${projectId}`);
    }

    const taskMap = new Map<string, any>();
    tasks.forEach(task => {
      taskMap.set(task.id, task);
    });
    
    // Group tasks by agent - use agentInitializationService
    const tasksByAgent = this.agentInitializationService.groupTasksByAgent(tasks);
    
    // Initialize local project context
    this.projectContext.set(projectId, {
      repository,
      allTasks: tasks,
      taskMap,
      completedTasks: [],
      currentPhase: 'planning',
      projectInfo: projectContext
    });

    // Initialize agents and channels
    await this.agentInitializationService.initializeAgentsAndChannels();

    // Verify/create specific agents
    await this.agentInitializationService.verifyAgentsExist(tasksByAgent);

    // Send kickoff message
    await this.agentInitializationService.sendProjectKickoffMessage(tasksByAgent);

    // Start planning phase
    await this.agentInitializationService.startPlanningPhase(projectId, tasksByAgent);

    // Queue tasks for execution
    for (const [agentId, agentTasks] of Object.entries(tasksByAgent)) {
      for (const task of agentTasks as any[]) {
        this.workQueue.push({ 
          agentId, 
          taskId: task.id,
          projectId 
        });
      }
    }

    setTimeout(() => {
      this.processWorkQueue();
    }, 5000);

  } catch (error) {
    this.logger.error('Error in startProjectWork:', error);
  }
}



testProjectCreatorAccess(projectId: string) {
  try {
    const hasService = !!this.projectCreatorService;
    let projectContext: any = null; // Use 'any' to avoid type conflicts
    let error: string | null = null; // Specify string type for errors

    if (hasService) {
      try {
        if (this.projectCreatorService.getProjectContext) {
          projectContext = this.projectCreatorService.getProjectContext(projectId);
        } else {
          error = 'getProjectContext method not available';
        }
      } catch (e) {
        error = e instanceof Error ? e.message : 'Unknown error occurred';
      }
    }

    return {
      hasProjectCreatorService: hasService,
      projectId: projectId,
      projectContextFound: !!projectContext,
      projectName: projectContext?.name || null,
      projectStatus: projectContext?.status || null,
      tasksCount: projectContext?.tasks?.length || 0,
      error: error,
      availableMethods: hasService ? Object.getOwnPropertyNames(Object.getPrototypeOf(this.projectCreatorService)) : [],
      serviceType: hasService ? this.projectCreatorService.constructor.name : null
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      hasProjectCreatorService: false,
      projectId: projectId,
      projectContextFound: false,
      projectName: null
    };
  }
}

private async processWorkQueue() {
    // Keep this as it coordinates task execution
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    while (this.workQueue.length > 0) {
      const work = this.workQueue.shift();
      if (work) {
        await this.taskExecutionService.executeAgentTask(
          work.agentId, work.taskId, work.projectId, this.activeWork, this.projectContext , this.websocketGateway
        );
        
        const delay = 5000 + Math.random() * 10000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.isProcessing = false;
  }

  async getAgentWorkStatus(): Promise<Array<{
    agent: { name: string; role: string; avatar: string };
    task: { title: string; type: string };
    work: AgentWork;
  }>> {
    const status: Array<{
      agent: { name: string; role: string; avatar: string };
      task: { title: string; type: string };
      work: AgentWork;
    }> = [];
    
    for (const [key, work] of this.activeWork.entries()) {
      const agent = await this.agentModel.findOne({ agentId: work.agentId });
      const task = await this.taskModel.findById(work.taskId);
      
      if (agent && task) {
        status.push({
          agent: {
            name: agent.name,
            role: agent.role,
            avatar: agent.avatar
          },
          task: {
            title: task.title,
            type: task.type
          },
          work
        });
      }
    }

    return status;
  }

}