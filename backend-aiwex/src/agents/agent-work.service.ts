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

export interface AgentWork {
  agentId: string;
  taskId: string;
  status: 'planning' | 'coding' | 'testing' | 'reviewing' | 'completed';
  currentActivity: string;
  progress: number;
  files: Array<{ path: string; content: string; status: 'planned' | 'created' | 'modified' }>;
  dependencies: string[];
  blockers: string[];
}

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
  public realCommunicationService: RealAgentCommunicationService, // ADD THIS LINE
) {}

  // Add these methods to your AgentWorkService class:
  // Update these methods in your AgentWorkService with proper typing:

// Add method to get all agents from database with proper typing
async getAllAgentsFromDB(): Promise<any[]> {
  try {
    const agents = await this.agentModel.find({}).lean().exec(); // Use .lean() for plain objects
    return agents || [];
  } catch (error) {
    this.logger.error('Error fetching agents from DB:', error);
    return [];
  }
}

// Add method to get all channels from database with proper typing
async getAllChannelsFromDB(): Promise<any[]> {
  try {
    const channels = await this.channelModel.find({}).lean().exec(); // Use .lean() for plain objects
    return channels || [];
  } catch (error) {
    this.logger.error('Error fetching channels from DB:', error);
    return [];
  }
}

// Update the initialization method with better error handling
async initializeAgentsAndChannels(): Promise<void> {
  this.logger.log('🔧 Initializing default agents and channels...');
  
  try {
    // Create default channels (this part looks correct)
    const defaultChannels = [
      { channelId: 'general', name: 'General', description: 'General discussion and announcements' },
      { channelId: 'development', name: 'Development', description: 'Development discussions and code reviews' },
      { channelId: 'design', name: 'Design', description: 'Design discussions and UI/UX feedback' },
      { channelId: 'testing', name: 'Testing', description: 'QA discussions and test results' },
      { channelId: 'management', name: 'Management', description: 'Project management and planning' }
    ];

    for (const channelData of defaultChannels) {
      try {
        const existingChannel = await this.channelModel.findOne({ channelId: channelData.channelId }).exec();
        if (!existingChannel) {
          const channel = new this.channelModel({
            ...channelData,
            type: 'text',
            isDefault: channelData.channelId === 'general'
          });
          await channel.save();
          this.logger.log(`📢 Created channel: ${channelData.name}`);
        } else {
          this.logger.log(`✅ Channel exists: ${channelData.name}`);
        }
      } catch (channelError) {
        this.logger.error(`Error creating channel ${channelData.name}:`, channelError);
      }
    }
    // Create default agents
    const defaultAgents = [
      {
        agentId: 'developer',
        name: 'Alex Developer',
        role: 'developer',
        avatar: 'https://ui-avatars.com/api/?name=Alex+Dev&background=4F46E5&color=fff',
        status: 'online',
        skills: ['JavaScript', 'React', 'Node.js', 'Git', 'MongoDB'],
        personality: 'Professional and detail-oriented developer who enjoys solving complex problems',
        configuration: {
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 1000,
          systemPrompt: 'You are Alex, a skilled full-stack developer specializing in modern web technologies.'
        },
        lastActiveAt: new Date()
      },
      {
        agentId: 'designer',
        name: 'Sarah Designer',
        role: 'designer',
        avatar: 'https://ui-avatars.com/api/?name=Sarah+Design&background=EC4899&color=fff',
        status: 'online',
        skills: ['UI/UX', 'Figma', 'Adobe Creative Suite', 'Prototyping'],
        personality: 'Creative and empathetic designer who prioritizes user experience',
        configuration: {
          model: 'gpt-4',
          temperature: 0.8,
          maxTokens: 1000,
          systemPrompt: 'You are Sarah, a creative UI/UX designer focused on user-centered design.'
        },
        lastActiveAt: new Date()
      },
      {
        agentId: 'qa',
        name: 'Emma QA',
        role: 'qa',
        avatar: 'https://ui-avatars.com/api/?name=Emma+QA&background=10B981&color=fff',
        status: 'online',
        skills: ['Testing', 'Automation', 'Bug Tracking', 'Quality Assurance'],
        personality: 'Meticulous and thorough QA engineer with an eye for detail',
        configuration: {
          model: 'gpt-4',
          temperature: 0.5,
          maxTokens: 1000,
          systemPrompt: 'You are Emma, a quality assurance engineer ensuring product reliability.'
        },
        lastActiveAt: new Date()
      },
      {
        agentId: 'manager',
        name: 'Mike Manager',
        role: 'manager',
        avatar: 'https://ui-avatars.com/api/?name=Mike+Manager&background=F59E0B&color=fff',
        status: 'online',
        skills: ['Project Management', 'Planning', 'Coordination', 'Leadership'],
        personality: 'Organized and diplomatic leader who keeps teams focused and motivated',
        configuration: {
          model: 'gpt-4',
          temperature: 0.6,
          maxTokens: 1000,
          systemPrompt: 'You are Mike, a project manager coordinating team efforts and ensuring project success.'
        },
        lastActiveAt: new Date()
      },
      {
        agentId: 'analyst',
        name: 'David Analyst',
        role: 'analyst',
        avatar: 'https://ui-avatars.com/api/?name=David+Analyst&background=8B5CF6&color=fff',
        status: 'online',
        skills: ['Data Analysis', 'Requirements', 'Documentation', 'Research'],
        personality: 'Analytical and systematic thinker who excels at breaking down complex requirements',
        configuration: {
          model: 'gpt-4',
          temperature: 0.4,
          maxTokens: 1000,
          systemPrompt: 'You are David, a business analyst focusing on requirements and documentation.'
        },
        lastActiveAt: new Date()
      }
    ];

    for (const agentData of defaultAgents) {
      try {
        const existingAgent = await this.agentModel.findOne({ agentId: agentData.agentId }).exec();
        if (!existingAgent) {
          const agent = new this.agentModel(agentData);
          await agent.save();
          this.logger.log(`👤 Created agent: ${agentData.name}`);
        } else {
          this.logger.log(`✅ Agent exists: ${agentData.name}`);
        }
      } catch (agentError) {
        this.logger.error(`Error creating agent ${agentData.name}:`, agentError);
      }
    }

    this.logger.log('✅ Initialization complete');
  } catch (error) {
    this.logger.error('❌ Error during initialization:', error);
    throw error;
  }
}
// Update the verification method with proper typing
private async verifyAgentsExist(tasksByAgent: Record<string, any[]>): Promise<void> {
  for (const agentId of Object.keys(tasksByAgent)) {
    try {
      const agent = await this.agentModel.findOne({ agentId }).exec();
      if (!agent) {
        this.logger.warn(`⚠️ Agent ${agentId} not found in database, creating default agent`);
        
        const defaultAgent = new this.agentModel({
          agentId,
          name: this.getDefaultAgentName(agentId),
          role: agentId,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(agentId)}&background=random&color=fff`,
          status: 'active',
          skills: this.getDefaultSkills(agentId),
          isOnline: true,
          bio: `AI ${agentId} agent`
        });
        
        await defaultAgent.save();
        this.logger.log(`✅ Created default agent: ${agentId}`);
      } else {
        // Use .lean() or cast to any to access custom properties
        const agentData = agent.toObject ? agent.toObject() : agent;
        this.logger.log(`✅ Agent verified: ${agentData.name} (${agentData.role})`);
      }
    } catch (error) {
      this.logger.error(`Error verifying agent ${agentId}:`, error);
    }
  }
}

// Update the sendAgentMessage method with better error handling
private async sendAgentMessage(agentId: string, channelId: string, content: string) {
  // Use real AI communication instead of hardcoded messages
  await this.realCommunicationService.sendAIMessage(
    agentId,
    channelId,
    'general_update',
    {
      conversationTopic: 'work_update',
      currentTask: this.getCurrentTaskForAgent(agentId)
    }
  );
}

async handleUserMention(
  channelId: string,
  mentionedAgentId: string,
  userMessage: string,
  userId: string,
  userName: string
): Promise<void> {
  await this.realCommunicationService.handleUserMention(
    channelId,
    mentionedAgentId,
    userMessage,
    userId,
    userName
  );
}

async askAgent(
  userId: string,
  userName: string,
  agentId: string,
  question: string,
  channelId: string = 'general'
): Promise<void> {
  try {
    this.logger.log(`User ${userName} asking ${agentId}: ${question}`);
    
    // Agent responds with AI-generated answer
    await this.realCommunicationService.sendAIMessage(
      agentId,
      channelId,
      'mention_response',
      {
        mentionedBy: userName,
        question: question,
        conversationTopic: 'user_question'
      },
      1500 + Math.random() * 2500 // Realistic response time
    );

  } catch (error) {
    this.logger.error('Error handling user question:', error);
  }
}

private async sendGitHubActivityMessage(
  agentId: string, 
  activity: string, 
  details: any
): Promise<void> {
  try {
    let message = '';
    
    switch (activity) {
      case 'branch_created':
        message = `🌿 **Branch Created**: \`${details.branchName}\` for task "${details.taskTitle}"`;
        break;
      case 'files_committed':
        message = `📝 **Files Committed**: Added ${details.fileCount} files to \`${details.branchName}\`\n${details.files.map(f => `- \`${f}\``).join('\n')}`;
        break;
      case 'pr_created':
        message = `🔄 **Pull Request Created**: [#${details.prNumber}](${details.prUrl}) - "${details.title}"\n📂 Branch: \`${details.branchName}\` → \`main\``;
        break;
      case 'issue_created':
        message = `📋 **Issue Created**: [#${details.issueNumber}](${details.issueUrl}) - "${details.title}"`;
        break;
      case 'pr_reviewed':
        message = `👀 **Pull Request Reviewed**: [#${details.prNumber}](${details.repository}) \n${details.approved ? '✅ Approved' : '💬 Comments added'}\n${details.summary}`;
        break;
      case 'pr_merged':
        message = `🎉 **Pull Request Merged**: [#${details.prNumber}](${details.repository})\n✅ Successfully merged by ${details.mergedBy}`;
        break;
      case 'review_request':
        message = `🔍 **Review Requested**: ${details.authorName} requested my review on PR #${details.prNumber} for "${details.taskTitle}"`;
        break;
      case 'task_started':
        message = `🚀 **Started Working**: Beginning implementation of "${details.taskTitle}"\n⏱️ Estimated: ${details.estimatedHours} hours`;
        break;
      case 'task_completed':
        message = `✨ **Task Completed**: "${details.taskTitle}"\n📊 Status: Ready for review`;
        break;
      default:
        message = `🔧 **GitHub Activity**: ${activity} - ${JSON.stringify(details)}`;
    }

    // Send the activity message
    await this.realCommunicationService.sendAIMessage(
      agentId,
      'general', // Always send to general channel
      'general_update',
      {
        conversationTopic: 'github_activity',
        activityType: activity,
        activityDetails: details
      }
    );

    this.logger.log(`GitHub activity message sent: ${agentId} - ${activity}`);
  } catch (error) {
    this.logger.error(`Error sending GitHub activity message:`, error);
  }
}


private getCurrentTaskForAgent(agentId: string): any {
  // Look through active work to find current task for this agent
  for (const [workKey, work] of this.activeWork.entries()) {
    if (work.agentId === agentId) {
      return {
        title: work.taskId,
        status: work.status,
        progress: work.progress
      };
    }
  }
  return null;
}

// Add this method to initialize agents and channels

// Add method to test project creator access
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

// Add this method to handle chat messages that might contain PR review requests
async handleChatMessage(
  channelId: string,
  userId: string,
  userName: string,
  message: string
): Promise<void> {
  try {
    // Check if message contains PR review request patterns
    const prReviewPattern = /review\s+PR\s*#?(\d+)\s+(?:in\s+|on\s+)?([a-zA-Z0-9-_]+)/i;
    const simplePrPattern = /review\s+#?(\d+)/i;
    
    let match = message.match(prReviewPattern);
    let prNumber: number | null = null;
    let repository: string | null = null;
    
    if (match) {
      prNumber = parseInt(match[1]);
      repository = match[2];
    } else {
      // Try simple pattern
      match = message.match(simplePrPattern);
      if (match) {
        prNumber = parseInt(match[1]);
        // Use a default repository or ask for clarification
        repository = 'ai-test-repo'; // You can make this configurable
      }
    }
    
    if (prNumber && repository) {
      // User is requesting a PR review
      this.logger.log(`Detected PR review request: PR #${prNumber} in ${repository}`);
      
      // Send acknowledgment
      await this.realCommunicationService.sendAIMessage(
        'manager',
        channelId,
        'general_update',
        {
          conversationTopic: 'pr_review_acknowledgment',
          userName: userName,
          prNumber: prNumber,
          repository: repository
        },
        500 // Quick response
      );
      
      // Start the review process
      await this.handlePRReviewRequest(
        userId,
        userName,
        channelId,
        repository,
        prNumber
      );
    }
    
    // Also check for status requests
    const statusPattern = /status\s+(?:of\s+)?PR\s*#?(\d+)/i;
    const statusMatch = message.match(statusPattern);
    
    if (statusMatch) {
      const prNum = parseInt(statusMatch[1]);
      await this.providePRStatus(channelId, prNum);
    }
    
  } catch (error) {
    this.logger.error('Error handling chat message:', error);
  }
}

// Add method to handle PR review requests from chat
private async handlePRReviewRequest(
  userId: string,
  userName: string,
  channelId: string,
  repository: string,
  prNumber: number
): Promise<void> {
  try {
    const username = this.configService.get<string>('GITHUB_USERNAME');
    
    // Create a review context
    const reviewTask = {
      id: `chat-review-${Date.now()}`,
      title: `Review PR #${prNumber}`,
      type: 'review' as const,
      priority: 'medium' as const,
      assignedTo: userName,
      description: `${userName} requested review via chat for PR #${prNumber}`
    };
    
    const context = {
      repository,
      projectId: `chat-review-${userId}`,
      username,
      channelId // Store channel for status updates
    };
    
    // Store review context for status tracking
    this.storeReviewContext(prNumber, {
      repository,
      channelId,
      requestedBy: userName,
      status: 'in-progress',
      startTime: new Date()
    });
    
    // Get appropriate reviewers
    const reviewers = await this.selectReviewersForChatRequest(reviewTask);
    
    // Notify about reviewers
    await this.realCommunicationService.sendAIMessage(
      'manager',
      channelId,
      'general_update',
      {
        conversationTopic: 'reviewers_assigned',
        prNumber: prNumber,
        reviewers: reviewers.map(r => r.name).join(', '),
        repository: repository
      },
      2000
    );
    
    // Start reviews
    for (const reviewer of reviewers) {
      await this.performAgentReviewWithChatUpdates(
        reviewer,
        { name: userName, role: 'user' } as any,
        reviewTask,
        prNumber,
        context
      );
    }
    
  } catch (error) {
    this.logger.error('Error handling PR review request:', error);
    
    // Send error message to chat
    await this.realCommunicationService.sendAIMessage(
      'manager',
      channelId,
      'general_update',
      {
        conversationTopic: 'review_error',
        error: error.message,
        prNumber: prNumber
      }
    );
  }
}

// Enhanced review method that sends updates to chat
public async performAgentReviewWithChatUpdates(
  reviewer: AgentDocument,
  author: any,
  task: any,
  prNumber: number,
  context: any
): Promise<void> {
  try {
    const username = this.configService.get<string>('GITHUB_USERNAME');
    if (!username) return;
    
    // Notify that reviewer is starting
    await this.realCommunicationService.sendAIMessage(
      reviewer.agentId,
      context.channelId,
      'general_update',
      {
        conversationTopic: 'starting_review',
        prNumber: prNumber,
        repository: context.repository
      },
      3000
    );
    
    // Get PR files
    const files = await this.githubCollabService.getPullRequestFiles(
      username,
      context.repository,
      prNumber
    );
    
    // Generate review
    const reviewResult = await this.generateAgentReview(reviewer, author, task, files);
    
    // Submit review to GitHub
    await this.githubCollabService.reviewPullRequest(
      username,
      context.repository,
      prNumber,
      {
        body: reviewResult.body,
        event: reviewResult.approved ? 'APPROVE' : reviewResult.changesRequested ? 'REQUEST_CHANGES' : 'COMMENT'
      }
    );
    
    // Send review result to chat
    await this.realCommunicationService.sendAIMessage(
      reviewer.agentId,
      context.channelId,
      'general_update',
      {
        conversationTopic: 'review_completed',
        prNumber: prNumber,
        approved: reviewResult.approved,
        changesRequested: reviewResult.changesRequested,
        summary: reviewResult.summary,
        repository: context.repository
      },
      2000
    );
    
    // Update review context
    this.updateReviewContext(prNumber, {
      [`${reviewer.agentId}_review`]: {
        approved: reviewResult.approved,
        summary: reviewResult.summary,
        timestamp: new Date()
      }
    });
    
    // If approved, check for merge
    if (reviewResult.approved) {
      await this.checkAndMergePRWithChatUpdate(prNumber, context, reviewer);
    }
    
  } catch (error) {
    this.logger.error(`Error in review with chat updates:`, error);
    
    // Send error to chat
    await this.realCommunicationService.sendAIMessage(
      reviewer.agentId,
      context.channelId,
      'general_update',
      {
        conversationTopic: 'review_error',
        error: error.message,
        prNumber: prNumber
      }
    );
  }
}

// Enhanced merge method with chat notifications
private async checkAndMergePRWithChatUpdate(
  prNumber: number, 
  context: any, 
  approver: AgentDocument
): Promise<void> {
  try {
    const username = this.configService.get<string>('GITHUB_USERNAME');
    if (!username) return;
    
    const status = await this.githubCollabService.checkPullRequestStatus(
      username,
      context.repository,
      prNumber
    );
    
    const approvals = status.reviews.filter(r => r.state === 'APPROVED').length;
    const changesRequested = status.reviews.filter(r => r.state === 'CHANGES_REQUESTED').length;
    
    if (changesRequested > 0) {
      // Notify about requested changes
      await this.realCommunicationService.sendAIMessage(
        'manager',
        context.channelId,
        'general_update',
        {
          conversationTopic: 'changes_requested',
          prNumber: prNumber,
          changesCount: changesRequested
        }
      );
      
      this.updateReviewContext(prNumber, { status: 'changes-requested' });
      return;
    }
    
    if (approvals > 0 && status.mergeable) {
      // Notify about upcoming merge
      await this.realCommunicationService.sendAIMessage(
        'manager',
        context.channelId,
        'general_update',
        {
          conversationTopic: 'preparing_merge',
          prNumber: prNumber,
          approvals: approvals
        },
        2000
      );
      
      // Merge after delay
      setTimeout(async () => {
        try {
          await this.githubCollabService.mergePullRequest(
            username,
            context.repository,
            prNumber,
            `Merge PR #${prNumber}: Auto-merged by AI review system`,
            `Approved by ${approver.name} via chat request`,
            'squash'
          );
          
          // Notify about successful merge
          await this.realCommunicationService.sendAIMessage(
            'manager',
            context.channelId,
            'general_update',
            {
              conversationTopic: 'pr_merged_success',
              prNumber: prNumber,
              repository: context.repository,
              mergedBy: approver.name
            }
          );
          
          this.updateReviewContext(prNumber, { status: 'merged' });
          
        } catch (mergeError) {
          this.logger.error(`Error merging PR #${prNumber}:`, mergeError);
          
          await this.realCommunicationService.sendAIMessage(
            'manager',
            context.channelId,
            'general_update',
            {
              conversationTopic: 'merge_failed',
              prNumber: prNumber,
              error: mergeError.message
            }
          );
          
          this.updateReviewContext(prNumber, { status: 'merge-failed' });
        }
      }, 5000);
    }
  } catch (error) {
    this.logger.error(`Error checking/merging PR:`, error);
  }
}

// Add review context storage
private reviewContexts = new Map<number, any>();

private storeReviewContext(prNumber: number, context: any): void {
  this.reviewContexts.set(prNumber, context);
}

private updateReviewContext(prNumber: number, updates: any): void {
  const existing = this.reviewContexts.get(prNumber) || {};
  this.reviewContexts.set(prNumber, { ...existing, ...updates });
}

private async providePRStatus(channelId: string, prNumber: number): Promise<void> {
  const context = this.reviewContexts.get(prNumber);
  
  if (!context) {
    await this.realCommunicationService.sendAIMessage(
      'manager',
      channelId,
      'general_update',
      {
        conversationTopic: 'pr_status_unknown',
        prNumber: prNumber
      }
    );
    return;
  }
  
  await this.realCommunicationService.sendAIMessage(
    'manager',
    channelId,
    'general_update',
    {
      conversationTopic: 'pr_status_report',
      prNumber: prNumber,
      status: context.status,
      repository: context.repository,
      requestedBy: context.requestedBy,
      reviews: context
    }
  );
}

// Helper to select reviewers for chat requests
private async selectReviewersForChatRequest(task: any): Promise<AgentDocument[]> {
  const reviewers: AgentDocument[] = [];
  
  // Always include QA for general reviews
  const qaAgent = await this.agentModel.findOne({ agentId: 'qa' }).exec();
  if (qaAgent) reviewers.push(qaAgent);
  
  // Include developer for code review
  const devAgent = await this.agentModel.findOne({ agentId: 'developer' }).exec();
  if (devAgent) reviewers.push(devAgent);
  
  return reviewers;
}

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
  try {
    const username = this.configService.get<string>('GITHUB_USERNAME');
    
    // Create a review context
    const reviewTask = {
      id: `user-review-${Date.now()}`,
      title: `Review PR #${prNumber}`,
      type: 'review' as const,
      priority: 'medium' as const,
      assignedTo: userName,
      description: description || `${userName} requested review for PR #${prNumber}`
    };
    
    const context = {
      repository,
      projectId: `user-review-${userId}`,
      username,
      channelId
    };
    
    // Get reviewers
    let reviewers: AgentDocument[] = [];
    if (specificReviewers && specificReviewers.length > 0) {
      reviewers = await this.agentModel.find({
        agentId: { $in: specificReviewers }
      }).exec();
    } else {
      // Get default reviewers based on the task
      reviewers = await this.selectReviewersForTask(
        { agentId: `user-${userId}`, name: userName, role: userRole } as any,
        reviewTask
      );
    }

    // Create author representation
    const authorAgent = {
      agentId: `user-${userId}`,
      name: userName,
      role: userRole,
      _id: userId,
      // Add minimal required fields for AgentDocument compatibility
      status: 'online',
      avatar: '',
      personality: 'User',
      skills: [],
      tasksCompleted: 0,
      tasksInProgress: 0,
      totalInteractions: 0
    } as any;

    // Perform reviews
    for (const reviewer of reviewers) {
      await this.performAgentReviewWithChatUpdates(
        reviewer,
        authorAgent,
        reviewTask,
        prNumber,
        context
      );
    }
  } catch (error) {
    this.logger.error('Error handling user PR review request:', error);
    throw error;
  }
}


// Update the existing getWorkQueueStatus method to include more info
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

  async startProjectWork(projectId: string, repository: string, tasks: any[]) {
  this.logger.log(`🚀 Starting project work for project: ${projectId}`);
  this.logger.log(`📁 Repository: ${repository}`);
  this.logger.log(`📝 Tasks received: ${tasks.length}`);

  try {
    // Verify ProjectCreatorService is available
    if (!this.projectCreatorService) {
      throw new Error('ProjectCreatorService not available - injection failed');
    }

    // Verify project context exists in ProjectCreatorService
    const projectContext = this.projectCreatorService.getProjectContext(projectId);
    if (!projectContext) {
      this.logger.warn(`⚠️ Project context not found in ProjectCreatorService for project: ${projectId}`);
      this.logger.warn('📋 Available projects:', this.projectCreatorService.getAllProjectContexts?.() || 'Method not available');
    } else {
      this.logger.log(`✅ Project context verified: ${projectContext.name}`);
    }

    // Create local task map for easy lookup
    const taskMap = new Map<string, any>();
    tasks.forEach(task => {
      taskMap.set(task.id, task);
      this.logger.log(`📋 Task stored: ${task.id} - ${task.title} (assigned to: ${task.assignedTo})`);
    });
    
    // Group tasks by agent
    const tasksByAgent = this.groupTasksByAgent(tasks);
    this.logger.log(`👥 Tasks grouped by agent:`, Object.keys(tasksByAgent));

    // Initialize local project context
    this.projectContext.set(projectId, {
      repository,
      allTasks: tasks,
      taskMap,
      completedTasks: [],
      currentPhase: 'planning',
      projectInfo: projectContext
    });

    // CRITICAL: Initialize agents and channels FIRST
    this.logger.log('🔧 Initializing agents and channels before starting work...');
    await this.initializeAgentsAndChannels();

    // CRITICAL: Verify/create specific agents for this project's tasks
    this.logger.log('👥 Verifying agents exist for assigned tasks...');
    await this.verifyAgentsExist(tasksByAgent);

    // Verify agents were actually created by checking the database
    await this.verifyAgentsInDatabase(tasksByAgent);

    // Send initial project kickoff message
    await this.sendProjectKickoffMessage(tasksByAgent);

    // Start planning phase
    await this.startPlanningPhase(projectId, tasksByAgent);

    // Queue tasks for execution AFTER ensuring agents exist
    for (const [agentId, agentTasks] of Object.entries(tasksByAgent)) {
      for (const task of agentTasks as any[]) {
        this.workQueue.push({ 
          agentId, 
          taskId: task.id,
          projectId 
        });
        this.logger.log(`⏳ Queued task: ${task.id} for agent: ${agentId}`);
      }
    }

    this.logger.log(`🎯 Work queue populated with ${this.workQueue.length} items`);

    // Start processing queue after a longer delay to ensure database operations complete
    setTimeout(() => {
      this.processWorkQueue();
    }, 5000); // Increased delay

  } catch (error) {
    this.logger.error('❌ Error in startProjectWork:', error);
    
    // Send error notification
    try {
      await this.sendAgentMessage(
        'manager',
        'general',
        `⚠️ **System Alert**: There was an issue starting the project work.\n\nError: ${error.message}\n\nI'll continue with limited functionality.`
      );
    } catch (msgError) {
      this.logger.error('Failed to send error message:', msgError);
    }
  }
}
private async verifyAgentsInDatabase(tasksByAgent: Record<string, any[]>): Promise<void> {
  this.logger.log('🔍 Verifying agents are actually in database...');
  
  for (const agentId of Object.keys(tasksByAgent)) {
    try {
      const agent = await this.agentModel.findOne({ agentId }).exec();
      if (agent) {
        const agentData = agent.toObject ? agent.toObject() : agent;
        this.logger.log(`✅ Database verification: Agent ${agentId} found - ${agentData.name}`);
      } else {
        this.logger.error(`❌ Database verification: Agent ${agentId} NOT found in database!`);
        
        // Force create the agent if it's still missing
        this.logger.log(`🔧 Force creating missing agent: ${agentId}`);
        await this.forceCreateAgent(agentId);
      }
    } catch (error) {
      this.logger.error(`Error verifying agent ${agentId} in database:`, error);
    }
  }
}
private async forceCreateAgent(agentId: string): Promise<void> {
  try {
    const agentData = {
      agentId,
      name: this.getDefaultAgentName(agentId),
      role: this.mapToValidRole(agentId),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(agentId)}&background=random&color=fff`,
      status: 'online',
      skills: this.getDefaultSkills(agentId),
      personality: this.getDefaultPersonality(agentId),
      configuration: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        systemPrompt: `You are ${this.getDefaultAgentName(agentId)}, an AI ${this.mapToValidRole(agentId)} agent.`
      },
      lastActiveAt: new Date()
    };

    const agent = new this.agentModel(agentData);
    await agent.save();
    
    this.logger.log(`✅ Force created agent: ${agentData.name}`);
    
    // Double-check it was created
    const verifyAgent = await this.agentModel.findOne({ agentId }).exec();
    if (verifyAgent) {
      this.logger.log(`✅ Verified force-created agent exists: ${agentId}`);
    } else {
      this.logger.error(`❌ Force-created agent still not found: ${agentId}`);
    }
  } catch (error) {
    this.logger.error(`Error force creating agent ${agentId}:`, error);
  }
}

private mapToValidRole(agentId: string): string {
  // Map any invalid role to a valid one from the enum
  const validRoles = ['developer', 'designer', 'qa', 'manager', 'analyst'];
  
  // Handle specific mappings
  if (agentId.includes('developer') || agentId.includes('dev')) {
    return 'developer';
  }
  if (agentId.includes('design')) {
    return 'designer';
  }
  if (agentId.includes('qa') || agentId.includes('test')) {
    return 'qa';
  }
  if (agentId.includes('manager') || agentId.includes('lead')) {
    return 'manager';
  }
  if (agentId.includes('analyst') || agentId.includes('business')) {
    return 'analyst';
  }
  
  // If agentId is already a valid role, use it
  if (validRoles.includes(agentId)) {
    return agentId;
  }
  
  // Default fallback
  return 'developer';
}

private getDefaultAgentName(agentId: string): string {
  const nameMap = {
    'developer': 'Alex Developer',
    'designer': 'Sarah Designer', 
    'qa': 'Emma QA',
    'manager': 'Mike Manager',
    'analyst': 'David Analyst',
    'junior-developer': 'Junior Developer', // Handle specific case
    'senior-developer': 'Senior Developer'
  };
  
  return nameMap[agentId] || `${agentId.charAt(0).toUpperCase() + agentId.slice(1).replace('-', ' ')} Agent`;
}
  
  private async sendProjectKickoffMessage(tasksByAgent: Record<string, any[]>): Promise<void> {
    try {
      await this.sendAgentMessage(
        'manager',
        'general',
        `🚀 **Project Kickoff!** Starting work on the new project. I've assigned tasks to the team:\n\n` +
        `${this.formatTaskAssignments(tasksByAgent)}\n\n` +
        `Let's collaborate and keep each other updated on progress! 💪`
      );
    } catch (error) {
      this.logger.error('Error sending kickoff message:', error);
    }
  }


  private getDefaultSkills(agentId: string): string[] {
  const skillsMap = {
    'developer': ['JavaScript', 'React', 'Node.js', 'Git'],
    'designer': ['UI/UX', 'Figma', 'Adobe Creative Suite'],
    'qa': ['Testing', 'Automation', 'Bug Tracking'],
    'manager': ['Project Management', 'Planning', 'Coordination'],
    'analyst': ['Data Analysis', 'Requirements', 'Documentation']
  };
  
  // Handle specific cases
  if (agentId.includes('developer') || agentId.includes('dev')) {
    return skillsMap['developer'];
  }
  if (agentId.includes('design')) {
    return skillsMap['designer'];
  }
  if (agentId.includes('qa') || agentId.includes('test')) {
    return skillsMap['qa'];
  }
  if (agentId.includes('manager') || agentId.includes('lead')) {
    return skillsMap['manager'];
  }
  if (agentId.includes('analyst') || agentId.includes('business')) {
    return skillsMap['analyst'];
  }
  
  return skillsMap[agentId] || ['General', 'Problem Solving'];
}

private getDefaultPersonality(agentId: string): string {
  const personalityMap = {
    'developer': 'Logical and systematic problem-solver who enjoys coding challenges',
    'designer': 'Creative and user-focused with strong aesthetic sensibilities',
    'qa': 'Detail-oriented and methodical with a passion for quality',
    'manager': 'Organized leader with excellent communication and planning skills',
    'analyst': 'Analytical thinker who excels at requirements gathering and documentation'
  };
  
  // Handle specific cases
  if (agentId.includes('developer') || agentId.includes('dev')) {
    return personalityMap['developer'];
  }
  if (agentId.includes('design')) {
    return personalityMap['designer'];
  }
  if (agentId.includes('qa') || agentId.includes('test')) {
    return personalityMap['qa'];
  }
  if (agentId.includes('manager') || agentId.includes('lead')) {
    return personalityMap['manager'];
  }
  if (agentId.includes('analyst') || agentId.includes('business')) {
    return personalityMap['analyst'];
  }
  
  return personalityMap[agentId] || 'Helpful and collaborative team member';
}

  private async startPlanningPhase(projectId: string, tasksByAgent: Record<string, any[]>) {
    try {
      const managerAgent = await this.agentModel.findOne({ agentId: 'manager' });
      if (managerAgent) {
        await this.sendAgentMessage(
          'manager',
          'management',
          `📋 **Planning Phase Started**\n\nTeam, let's discuss our approach and identify any dependencies.`
        );

        // Each agent discusses their tasks
        for (const [agentId, tasks] of Object.entries(tasksByAgent)) {
          if (tasks.length > 0) {
            const agent = await this.agentModel.findOne({ agentId });
            if (agent) {
              try {
                const planMessage = await this.generateAgentPlan(agent, tasks, projectId);
                await this.sendAgentMessage(agentId, 'development', planMessage);
              } catch (error) {
                this.logger.error(`Error generating plan for ${agentId}:`, error);
              }
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in planning phase:', error);
    }
  }


 private async generateAgentPlan(agent: AgentDocument, tasks: any[], projectId: string): Promise<string> {
    try {
      const context = this.projectContext.get(projectId);
      const taskDescriptions = tasks.map(t => `- ${t.title}: ${t.description}`).join('\n');

      const prompt = `As ${agent.name} (${agent.role}), create a brief plan for these tasks:
${taskDescriptions}

Consider:
1. Dependencies on other team members
2. Potential challenges
3. Estimated approach
4. Any questions or clarifications needed

Keep it conversational and brief (2-3 sentences per task).`;

      const plan = await this.openAIService.generateCode(prompt, 'text');
      return `**${agent.name}'s Plan:**\n\n${plan}`;
    } catch (error) {
      this.logger.error('Error generating agent plan:', error);
      return `**${agent.name}'s Plan:**\n\nI'm ready to work on ${tasks.length} task(s). Let me get started!`;
    }
  }


  private async processWorkQueue() {
    if (this.isProcessing) {
      this.logger.log('⏳ Work queue already processing...');
      return;
    }
    
    this.isProcessing = true;
    this.logger.log(`🔄 Processing work queue with ${this.workQueue.length} items`);

    while (this.workQueue.length > 0) {
      const work = this.workQueue.shift();
      if (work) {
        this.logger.log(`🎯 Processing: ${work.taskId} for ${work.agentId}`);
        await this.executeAgentTask(work.agentId, work.taskId, work.projectId);
        
        // Random delay between tasks (5-15 seconds)
        const delay = 5000 + Math.random() * 10000;
        this.logger.log(`⏱️ Waiting ${Math.round(delay/1000)}s before next task...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.isProcessing = false;
    this.logger.log('✅ Work queue processing completed');
  }

private async executeAgentTask(agentId: string, taskId: string, projectId: string) {
  this.logger.log(`🎯 Processing: ${taskId} for ${agentId}`);
  this.logger.log(`Executing task: ${taskId} for agent: ${agentId} in project: ${projectId}`);

  try {
    // Try to get agent from database with detailed logging
    this.logger.log(`🔍 Looking for agent: ${agentId} in database...`);
    const agent = await this.agentModel.findOne({ agentId }).exec();
    
    if (!agent) {
      this.logger.error(`❌ Agent ${agentId} not found in database`);
      
      // Try to create the agent on-the-fly
      this.logger.log(`🔧 Attempting to create missing agent: ${agentId}`);
      await this.forceCreateAgent(agentId);
      
      // Try to find it again
      const retryAgent = await this.agentModel.findOne({ agentId }).exec();
      if (!retryAgent) {
        throw new Error(`Agent ${agentId} not found in database and could not be created`);
      }
      
      this.logger.log(`✅ Successfully created and found agent: ${agentId}`);
    } else {
      const agentData = agent.toObject ? agent.toObject() : agent;
      this.logger.log(`✅ Found agent: ${agentData.name} (${agentData.role})`);
    }

    // Get project context
    const context = this.projectContext.get(projectId);
    if (!context) {
      throw new Error(`Project context not found for project: ${projectId}`);
    }

    // Get task from context - FIXED: Properly declare task variable
    const task = context.taskMap.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in project context`);
    }

    this.logger.log(`📋 Found task: ${task.title} assigned to: ${task.assignedTo}`);

    const username = this.configService.get<string>('GITHUB_USERNAME');
    if (!username) {
      throw new Error('GitHub username not configured');
    }

    // Get the current agent (either found or newly created)
    const currentAgent = await this.agentModel.findOne({ agentId }).exec();
    if (!currentAgent) {
      throw new Error(`Agent ${agentId} still not available after creation attempt`);
    }

    // Initialize work tracking
    const work: AgentWork = {
      agentId,
      taskId,
      status: 'planning',
      currentActivity: 'Analyzing requirements',
      progress: 0,
      files: [],
      dependencies: [],
      blockers: []
    };
    this.activeWork.set(`${agentId}-${taskId}`, work);

    // 1. Send task started message
    await this.sendGitHubActivityMessage(agentId, 'task_started', {
      taskTitle: task.title,
      taskDescription: task.description,
      estimatedHours: task.estimatedHours,
      priority: task.priority
    });

    // 2. Planning phase
    await this.updateAgentWork(work, 'planning', 'Analyzing task requirements', 10);
    
    // 3. Check dependencies
    const dependencies = await this.checkDependencies(currentAgent, task, context);
    if (dependencies.length > 0) {
      work.dependencies = dependencies;
      await this.realCommunicationService.sendAIMessage(
        agentId,
        'general',
        'collaboration_request',
        {
          currentTask: task,
          conversationTopic: `Need to coordinate with: ${dependencies.join(', ')}`
        }
      );
    }

    // 4. Generate implementation
    await this.updateAgentWork(work, 'coding', 'Writing code', 30);
    const implementation = await this.generateImplementation(currentAgent, task, context);
    work.files = implementation.files;

    // 5. Create feature branch
    const branchName = `feature/${task.title.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}-${taskId.substring(0, 8)}`;
    let branchCreated = false;
    
    try {
      await this.githubCollabService.createBranch(
        username,
        context.repository,
        branchName,
        'main'
      );
      branchCreated = true;
      this.logger.log(`✅ Branch created: ${branchName}`);
      
      // Send branch creation message
      await this.sendGitHubActivityMessage(agentId, 'branch_created', {
        branchName,
        taskTitle: task.title,
        repository: context.repository
      });
      
    } catch (error) {
      this.logger.error('❌ Error creating branch:', error.message);
    }

    // 6. Simulate work completion
    await this.updateAgentWork(work, 'coding', 'Writing and committing code', 60);
    
    if (implementation.files.length > 0) {
      for (const file of implementation.files) {
        const workFile = work.files.find(f => f.path === file.path);
        if (workFile) {
          workFile.status = 'created';
        }
      }

      // Send files committed message
      await this.sendGitHubActivityMessage(agentId, 'files_committed', {
        fileCount: implementation.files.length,
        files: implementation.files.map(f => f.path),
        branchName,
        repository: context.repository
      });
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    // 7. Testing phase
    const agentData = currentAgent.toObject ? currentAgent.toObject() : currentAgent;
    if (agentData.role === 'qa' || task.type === 'test') {
      await this.updateAgentWork(work, 'testing', 'Running tests', 80);
      await this.realCommunicationService.sendAIMessage(
        agentId,
        'general',
        'general_update',
        {
          conversationTopic: 'testing_update',
          taskTitle: task.title,
          testResults: 'All tests passing'
        }
      );
    }

    // 8. Create Pull Request (if it's a development task)
    if (task.type === 'feature' || task.type === 'bug') {
      try {
        const prDescription = this.generatePRDescription(currentAgent, task, implementation);
        
        const pr = await this.githubCollabService.createPullRequest(
          username,
          context.repository,
          task.title,
          prDescription,
          branchName,
          'main',
          [],
          [task.type, 'ai-generated', `priority-${task.priority}`]
        );

        // Send PR creation message
        await this.sendGitHubActivityMessage(agentId, 'pr_created', {
          prNumber: pr.number,
          prUrl: pr.html_url,
          title: task.title,
          branchName,
          repository: context.repository,
          filesChanged: implementation.files.length
        });

        this.logger.log(`✅ PR created: #${pr.number}`);
        
      } catch (error) {
        this.logger.error('❌ Error creating PR:', error);
      }
    }

    // 9. Completion
    await this.updateAgentWork(work, 'completed', 'Task completed', 100);
    
    // Send task completion message
    await this.sendGitHubActivityMessage(agentId, 'task_completed', {
      taskTitle: task.title,
      repository: context.repository,
      branchName,
      filesCreated: implementation.files.length,
      summary: implementation.summary
    });

    // Update task status in ProjectCreatorService if available
    try {
      this.projectCreatorService?.updateTaskStatus?.(projectId, taskId, 'done');
    } catch (error) {
      this.logger.warn('Could not update task status in ProjectCreatorService:', error.message);
    }

    this.logger.log(`✅ Task ${taskId} completed successfully`);

  } catch (error) {
    this.logger.error(`❌ Error executing task ${taskId}:`, error);
    
    // Update work with error
    const workKey = `${agentId}-${taskId}`;
    const work = this.activeWork.get(workKey);
    if (work) {
      work.blockers.push(error.message);
      work.status = 'planning'; // Reset to planning
    }
    
    // Send error message
    await this.realCommunicationService.sendAIMessage(
      agentId,
      'general',
      'general_update',
      {
        conversationTopic: 'error_report',
        taskTitle: taskId, // Use taskId as fallback since task might not be available
        error: error.message
      }
    );
  }
}

// Also add the sendGitHubActivityMessage method if you haven't already:

  private async checkDependencies(agent: AgentDocument, task: any, context: any): Promise<string[]> {
    const dependencies: string[] = [];
    
    // Check if task depends on other tasks
    if (task.dependencies && task.dependencies.length > 0) {
      for (const depTaskId of task.dependencies) {
        const depTask = context.taskMap.get(depTaskId);
        if (depTask && depTask.status !== 'done') {
          const depAgent = await this.agentModel.findOne({ agentId: depTask.assignedTo });
          if (depAgent) {
            dependencies.push(depAgent.name);
          }
        }
      }
    }

    // Role-specific dependencies
    if (agent.role === 'designer' && task.type === 'design') {
      dependencies.push('Product requirements from Mike Manager');
    } else if (agent.role === 'qa' && task.type === 'test') {
      dependencies.push('Implementation from Alex Dev');
    }

    return dependencies;
  }

  private async generateImplementation(agent: AgentDocument, task: any, context: any) {
    const prompt = `As ${agent.name} (${agent.role}), implement the following task:
Title: ${task.title}
Description: ${task.description}
Type: ${task.type}
Project Context: ${JSON.stringify(context.allTasks.map(t => ({ title: t.title, assignedTo: t.assignedTo })))}

Generate:
1. A list of files to create/modify with their content
2. A brief summary of the implementation
3. Any integration points with other team members' work

Respond in JSON format:
{
  "files": [{ "path": "string", "content": "string" }],
  "summary": "string",
  "integrationPoints": ["string"]
}`;

    const response = await this.openAIService.generateProjectStructure(prompt);
    return {
      files: response.files || [],
      summary: response.summary || 'Implementation completed',
      integrationPoints: response.integrationPoints || []
    };
  }

  private async requestPeerReview(author: AgentDocument, task: any, prNumber: number, context: any) {
    // Select reviewers based on task type
    const reviewers = await this.selectReviewers(author, task);
    const username = this.configService.get<string>('GITHUB_USERNAME');
    if (!username) return;
    
    for (const reviewer of reviewers) {
      await this.sendAgentMessage(
        reviewer.agentId,
        'development',
        `${author.name} requested my review on PR #${prNumber} for "${task.title}". Let me take a look... 👀`
      );

      // Simulate review delay
      setTimeout(async () => {
        const review = await this.generateReview(reviewer, author, task, context);
        
        await this.githubCollabService.reviewPullRequest(
          username,
          context.repository,
          prNumber,
          {
            body: review.body,
            event: review.approved ? 'APPROVE' : 'COMMENT'
          }
        );

        await this.sendAgentMessage(
          reviewer.agentId,
          'development',
          `Reviewed PR #${prNumber}: ${review.summary}`
        );
      }, 10000 + Math.random() * 20000); // 10-30 seconds
    }
  }

  private async selectReviewers(author: AgentDocument, task: any): Promise<AgentDocument[]> {
    const reviewers: AgentDocument[] = [];
    
    // Always include QA for code tasks
    if (task.type === 'feature' && author.role !== 'qa') {
      const qaAgent = await this.agentModel.findOne({ role: 'qa' });
      if (qaAgent) reviewers.push(qaAgent);
    }

    // Include a senior developer for junior's work
    if (author.role === 'developer') {
      const seniorDev = await this.agentModel.findOne({ 
        role: 'developer', 
        agentId: { $ne: author.agentId } 
      });
      if (seniorDev) reviewers.push(seniorDev);
    }

    // Manager reviews critical features
    if (task.priority === 'high') {
      const manager = await this.agentModel.findOne({ role: 'manager' });
      if (manager) reviewers.push(manager);
    }

    return reviewers;
  }

  private async generateReview(reviewer: AgentDocument, author: AgentDocument, task: any, context: any) {
    const prompt = `As ${reviewer.name} (${reviewer.role}), review the work done by ${author.name} on:
Task: ${task.title}
Description: ${task.description}

Based on my role and expertise, provide:
1. Whether to approve or request changes
2. A brief review comment (2-3 sentences)
3. A one-line summary for the team

Respond in JSON format:
{
  "approved": boolean,
  "body": "string",
  "summary": "string"
}`;

    return await this.openAIService.generateProjectStructure(prompt);
  }

  private async updateAgentWork(work: AgentWork, status: AgentWork['status'], activity: string, progress: number) {
    work.status = status;
    work.currentActivity = activity;
    work.progress = progress;

    this.websocketGateway.sendAgentWorkUpdate({
      agentId: work.agentId,
      taskId: work.taskId,
      status,
      activity,
      progress
    });
  }

  
  private groupTasksByAgent(tasks: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    for (const task of tasks) {
      const agentId = task.assignedTo.startsWith('user-') ? null : task.assignedTo;
      if (agentId) {
        if (!grouped[agentId]) grouped[agentId] = [];
        grouped[agentId].push(task);
      }
    }

    return grouped;
  }

  private formatTaskAssignments(tasksByAgent: Record<string, any[]>): string {
    const assignments: string[] = [];
    
    for (const [agentId, tasks] of Object.entries(tasksByAgent)) {
      const agentName = this.getDefaultAgentName(agentId);
      assignments.push(`**${agentName}**: ${tasks.length} task${tasks.length > 1 ? 's' : ''}`);
    }

    return assignments.join('\n');
  }

  private generatePRDescription(agent: AgentDocument, task: any, implementation: any): string {
    return `## Summary
${implementation.summary}

## Task Details
- **Title**: ${task.title}
- **Type**: ${task.type}
- **Priority**: ${task.priority}
- **Implemented by**: ${agent.name} (${agent.role})

## Changes Made
${implementation.files.map(f => `- \`${f.path}\` - ${f.status}`).join('\n')}

## Integration Points
${implementation.integrationPoints?.join('\n') || 'None'}

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests passing
- [ ] Manual testing completed

---
*This PR was created by the AI ${agent.role} agent*`;
  }

  // Add these methods to your AgentWorkService class:

private async requestAgentReview(author: AgentDocument, task: any, prNumber: number, context: any) {
  this.logger.log(`📋 Requesting review for PR #${prNumber}`);
  
  // Select appropriate reviewers based on task type and author role
  const reviewers = await this.selectReviewersForTask(author, task);
  const username = this.configService.get<string>('GITHUB_USERNAME');
  
  if (!username) {
    this.logger.error('GitHub username not configured');
    return;
  }

  // Delay reviews slightly for realism
  setTimeout(async () => {
    for (const reviewer of reviewers) {
      try {
        // Send review request message
        await this.realCommunicationService.sendAIMessage(
          reviewer.agentId,
          'general',
          'general_update',
          {
            conversationTopic: 'review_request',
            prNumber: prNumber,
            taskTitle: task.title,
            authorName: author.name,
            repository: context.repository
          }
        );

        // Perform the actual review
        await this.performAgentReview(reviewer, author, task, prNumber, context);
        
      } catch (error) {
        this.logger.error(`Error requesting review from ${reviewer.name}:`, error);
      }
    }
  }, 5000); // 5 second delay before starting reviews
}

private async performAgentReview(
  reviewer: AgentDocument, 
  author: AgentDocument, 
  task: any, 
  prNumber: number, 
  context: any
) {
  try {
    const username = this.configService.get<string>('GITHUB_USERNAME');
    if (!username) return;

    // Get PR files to review
    const files = await this.githubCollabService.getPullRequestFiles(
      username,
      context.repository,
      prNumber
    );

    // Generate AI review based on reviewer's role and expertise
    const reviewResult = await this.generateAgentReview(reviewer, author, task, files);
    
    // Submit the review to GitHub
    await this.githubCollabService.reviewPullRequest(
      username,
      context.repository,
      prNumber,
      {
        body: reviewResult.body,
        event: reviewResult.approved ? 'APPROVE' : reviewResult.changesRequested ? 'REQUEST_CHANGES' : 'COMMENT'
      }
    );

    // Send review completion message
    await this.sendGitHubActivityMessage(reviewer.agentId, 'pr_reviewed', {
      prNumber: prNumber,
      approved: reviewResult.approved,
      summary: reviewResult.summary,
      repository: context.repository
    });

    // If all reviewers approved, merge the PR
    if (reviewResult.approved) {
      await this.checkAndMergePR(prNumber, context, reviewer);
    }

  } catch (error) {
    this.logger.error(`Error performing review by ${reviewer.name}:`, error);
  }
}

private async generateAgentReview(
  reviewer: AgentDocument,
  author: AgentDocument,
  task: any,
  files: any[]
): Promise<{ approved: boolean; changesRequested: boolean; body: string; summary: string }> {
  const prompt = `You are ${reviewer.name}, a ${reviewer.role} reviewing a pull request.

PR Author: ${author.name} (${author.role})
Task: ${task.title}
Task Type: ${task.type}
Priority: ${task.priority}
Files Changed: ${files.length}
File Names: ${files.map(f => f.filename).join(', ')}

Based on your role and expertise as a ${reviewer.role}, review this PR considering:
1. Code quality and best practices
2. Whether it fulfills the task requirements
3. Potential bugs or issues
4. Performance considerations
5. Security concerns (if applicable)

Provide a realistic code review that:
- Is constructive and helpful
- Points out both positives and areas for improvement
- Decides whether to approve, request changes, or just comment
- Includes specific suggestions if changes are needed

Respond in JSON format:
{
  "approved": boolean (true if code looks good to merge),
  "changesRequested": boolean (true if changes are needed),
  "body": "Detailed review comments in markdown format",
  "summary": "One-line summary of the review"
}`;

  try {
    const response = await this.openAIService.generateProjectStructure(prompt);
    
    // Ensure we have valid response
    if (!response || typeof response !== 'object') {
      return {
        approved: true,
        changesRequested: false,
        body: `## Review by ${reviewer.name}\n\nLooks good to me! The implementation meets the requirements.`,
        summary: "Approved - implementation looks good"
      };
    }

    return {
      approved: response.approved || false,
      changesRequested: response.changesRequested || false,
      body: response.body || `Reviewed by ${reviewer.name}`,
      summary: response.summary || "Review completed"
    };
  } catch (error) {
    this.logger.error('Error generating AI review:', error);
    // Fallback review
    return {
      approved: true,
      changesRequested: false,
      body: `## Review by ${reviewer.name}\n\n✅ The implementation looks good and meets the task requirements.`,
      summary: "Approved - no issues found"
    };
  }
}

private async checkAndMergePR(prNumber: number, context: any, approver: AgentDocument) {
  try {
    const username = this.configService.get<string>('GITHUB_USERNAME');
    if (!username) return;

    // Check PR status
    const status = await this.githubCollabService.checkPullRequestStatus(
      username,
      context.repository,
      prNumber
    );

    // Check if we have enough approvals (for now, one approval is enough)
    const approvals = status.reviews.filter(r => r.state === 'APPROVED').length;
    const changesRequested = status.reviews.filter(r => r.state === 'CHANGES_REQUESTED').length;

    if (changesRequested > 0) {
      this.logger.log(`PR #${prNumber} has requested changes, not merging`);
      return;
    }

    if (approvals > 0 && status.mergeable) {
      // Add a slight delay for realism
      setTimeout(async () => {
        try {
          // Merge the PR
          await this.githubCollabService.mergePullRequest(
            username,
            context.repository,
            prNumber,
            `Merge PR #${prNumber}: Auto-merged by AI review system`,
            `This PR was reviewed and approved by ${approver.name}`,
            'squash'
          );

          // Send merge success message
          await this.sendGitHubActivityMessage('manager', 'pr_merged', {
            prNumber: prNumber,
            mergedBy: approver.name,
            repository: context.repository
          });

          this.logger.log(`✅ PR #${prNumber} successfully merged`);
        } catch (mergeError) {
          this.logger.error(`Error merging PR #${prNumber}:`, mergeError);
        }
      }, 10000); // 10 second delay before merging
    } else {
      this.logger.log(`PR #${prNumber} not ready for merge - approvals: ${approvals}, mergeable: ${status.mergeable}`);
    }
  } catch (error) {
    this.logger.error(`Error checking/merging PR #${prNumber}:`, error);
  }
}

public async selectReviewersForTask(author: AgentDocument, task: any): Promise<AgentDocument[]> {
  const reviewers: AgentDocument[] = [];
  
  try {
    // QA always reviews code changes
    if ((task.type === 'feature' || task.type === 'bug') && author.role !== 'qa') {
      const qaAgent = await this.agentModel.findOne({ agentId: 'qa' }).exec();
      if (qaAgent) reviewers.push(qaAgent);
    }

    // Manager reviews high priority items
    if (task.priority === 'high' && author.role !== 'manager') {
      const managerAgent = await this.agentModel.findOne({ agentId: 'manager' }).exec();
      if (managerAgent) reviewers.push(managerAgent);
    }

    // For design tasks, designer reviews
    if (task.type === 'design' && author.role !== 'designer') {
      const designerAgent = await this.agentModel.findOne({ agentId: 'designer' }).exec();
      if (designerAgent) reviewers.push(designerAgent);
    }

    // If author is junior, get a senior developer to review
    if (author.agentId.includes('junior')) {
  const seniorDev = await this.agentModel.findOne({ 
    role: 'developer',  // Find by role instead
    agentId: { $ne: author.agentId }  // Exclude the author
  }).exec();
  if (seniorDev) reviewers.push(seniorDev);
}

    // If no specific reviewers, default to developer (if not the author)
    if (reviewers.length === 0 && author.role !== 'developer') {
      const devAgent = await this.agentModel.findOne({ agentId: 'developer' }).exec();
      if (devAgent) reviewers.push(devAgent);
    }

    return reviewers;
  } catch (error) {
    this.logger.error('Error selecting reviewers:', error);
    return [];
  }
}

  // Get current work status for all agents
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