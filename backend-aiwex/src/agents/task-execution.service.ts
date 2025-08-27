import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Agent, AgentDocument } from '../database/schemas/agent.schema';
import { Model } from 'mongoose';
import { OpenAIService } from "src/openai/openai.service";
import { GithubCollaborationService } from "src/github/github-collaboration.service";
import { ConfigService } from "@nestjs/config";
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { RealAgentCommunicationService } from "./communication/real-agent-communication.service";
import { GitHubActivityService } from "./github-activity.service";
import { PrReviewService } from "./pr-review.service";
import { AgentWork } from "./agent-work.interface";
import { Logger } from "@nestjs/common";

@Injectable()
export class TaskExecutionService {
  private readonly logger = new Logger(TaskExecutionService.name);
  constructor(
    @InjectModel(Agent.name) private agentModel: Model<AgentDocument>,
    private openAIService: OpenAIService,
    private githubCollabService: GithubCollaborationService,
    private configService: ConfigService,
    private githubActivityService: GitHubActivityService,
    private prReviewService: PrReviewService,
    private realCommunicationService: RealAgentCommunicationService,
    private websocketGateway: WebsocketGateway
  ) {}

  async executeAgentTask(
  agentId: string, 
  taskId: string, 
  projectId: string,
  activeWork: Map<string, AgentWork>,
  projectContext: Map<string, any>,
  websocketGateway: any // Add this parameter
): Promise<void> {
  this.logger.log(`Processing: ${taskId} for ${agentId}`);
  this.logger.log(`Executing task: ${taskId} for agent: ${agentId} in project: ${projectId}`);

  try {
    const agent = await this.agentModel.findOne({ agentId }).exec();
    
    if (!agent) {
      this.logger.error(`Agent ${agentId} not found in database`);
      // Handle missing agent...
      return;
    }

    const context = projectContext.get(projectId);
    if (!context) {
      throw new Error(`Project context not found for project: ${projectId}`);
    }

    const task = context.taskMap.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in project context`);
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
    activeWork.set(`${agentId}-${taskId}`, work);

    // Send task started message
    await this.githubActivityService.sendGitHubActivityMessage(agentId, 'task_started', {
      taskTitle: task.title,
      taskDescription: task.description,
      estimatedHours: task.estimatedHours,
      priority: task.priority
    });

    // Update work progress
    await this.updateAgentWork(work, 'planning', 'Analyzing task requirements', 10, websocketGateway);
    
    // Rest of the implementation...

  } catch (error) {
    this.logger.error(`Error executing task ${taskId}:`, error);
    
    const work = activeWork.get(`${agentId}-${taskId}`);
    if (work) {
      work.blockers.push(error.message);
      work.status = 'planning';
    }
  }
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


private async updateAgentWork(
  work: AgentWork, 
  status: AgentWork['status'], 
  activity: string, 
  progress: number,
  websocketGateway: any
) {
  work.status = status;
  work.currentActivity = activity;
  work.progress = progress;

  websocketGateway.sendAgentWorkUpdate({
    agentId: work.agentId,
    taskId: work.taskId,
    status,
    activity,
    progress
  });
}

}