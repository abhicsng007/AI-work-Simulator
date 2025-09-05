import { Injectable } from "@nestjs/common";
import { GeneratedTask , GeneratedProject , GeneratedFile } from "./project.interface";
import { Logger } from "@nestjs/common";
import { CodeGenerationService } from "./code-generation.service";
import { GithubIntegrationService } from "./github-integration.service";
import { WebsocketGateway } from "src/websocket/websocket.gateway";
import { UsersService } from "src/users/users.service";
import { Inject,forwardRef } from "@nestjs/common";
import { AgentWorkService } from "src/agents/agent-work.service";
import { ProjectUtils } from "./project.utils";
import { ConfigService } from "@nestjs/config";
import { GithubService } from "src/github/github.service";
import { ProjectContextService } from "./project-context.service";

@Injectable()
export class TaskManagementService {
  private readonly logger = new Logger(TaskManagementService.name);
  private projects = new Map<string, GeneratedProject>();

  constructor(
    private codeGenerationService: CodeGenerationService,
    private githubIntegrationService: GithubIntegrationService,
    private websocketGateway: WebsocketGateway,
    private usersService: UsersService,
    private configService: ConfigService,
    private githubService: GithubService,

    @Inject(forwardRef(() => AgentWorkService)) private agentWorkService: AgentWorkService,
  ) {}

  async executeProjectTasks(project: GeneratedProject, user: any) {
    this.logger.log(`Executing tasks for project: ${project.id}`);
    
    const sortedTasks = ProjectUtils.sortTasksByDependencies(project.tasks);

    for (const task of sortedTasks) {
      if (!task.assignedTo.startsWith('user-')) {
        this.scheduleAgentTaskWithContext(project, task);
      } else {
        this.websocketGateway.sendUserNotification(user.id, {
          type: 'task-assigned',
          taskId: task.id,
          taskTitle: task.title,
          projectName: project.name
        });
      }
    }
  }

  private scheduleAgentTaskWithContext(project: GeneratedProject, task: GeneratedTask) {
    const delay = Math.min(task.estimatedHours * 2000, 60000);
    
    setTimeout(async () => {
      try {
        task.status = 'in-progress';
        this.websocketGateway.sendTaskUpdate(task.id, `${task.assignedTo} agent started working on: ${task.title}`);
        
        // Generate actual code for the task with context validation
        const generatedFiles = await this.generateTaskCodeWithContext(project, task);
        task.files = generatedFiles;
        
        setTimeout(async () => {
          try {
            task.status = 'review';
            this.websocketGateway.sendTaskUpdate(task.id, `${task.assignedTo} agent completed: ${task.title}`);
            
            // Create PR with actual code for code tasks
            if (task.type === 'feature' && task.assignedTo === 'developer' && generatedFiles.length > 0) {
              await this.githubIntegrationService.createAgentPullRequestWithCode(project, task);
            }
          } catch (error) {
            this.logger.error(`Error completing task ${task.id}:`, error);
            task.status = 'todo';
            this.websocketGateway.sendTaskUpdate(task.id, `Error completing ${task.title}: ${error.message}`);
          }
        }, delay);
      } catch (error) {
        this.logger.error(`Error starting task ${task.id}:`, error);
        this.websocketGateway.sendTaskUpdate(task.id, `Error starting ${task.title}: ${error.message}`);
      }
    }, 5000);
  }

  private async generateTaskCodeWithContext(project: GeneratedProject, task: GeneratedTask): Promise<GeneratedFile[]> {
    try {
      // Validate GitHub repository exists
      const username = this.configService.get<string>('GITHUB_USERNAME');
      if (!username) {
        throw new Error('GitHub username not configured');
      }

      // Check if repository is accessible
      try {
        await this.githubService.getRepository(username, project.repository);
      } catch (repoError) {
        this.logger.warn(`Repository ${project.repository} may not be ready yet, proceeding with code generation`);
      }

      // Generate code with full context using code generation service
      return await this.codeGenerationService.generateTaskCode(project, task);

    } catch (error) {
      this.logger.error('Error generating task code with context:', error);
      return await this.codeGenerationService.generateFallbackTaskFiles(project, task);
    }
  }

  validateAgentAccess(projectId: string, agentRole: string, projectContextService: ProjectContextService): boolean {
    const project = projectContextService.getProjectContext(projectId);
    if (!project) {
      this.logger.error(`Cannot validate agent access: Project ${projectId} not found`);
      return false;
    }

    const agentTasks = project.tasks.filter(task => task.assignedTo === agentRole);
    if (agentTasks.length === 0) {
      this.logger.warn(`No tasks found for agent ${agentRole} in project ${projectId}`);
      return false;
    }

    return true;
  }

  updateTaskStatus(project: GeneratedProject, taskId: string, status: GeneratedTask['status']) {
    const task = project.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      this.websocketGateway.sendTaskStatusUpdate({
        projectId: project.id,
        taskId,
        status
      });
    }
  }

  public async setupAgentContext(project: GeneratedProject): Promise<void> {
  try {
    this.logger.log(`Setting up agent context for project: ${project.id}`);
    
    // Ensure project is stored in memory
    this.projects.set(project.id, project);
    
    // Create agent context data
    const agentContext = {
      projectId: project.id,
      projectName: project.name,
      repository: project.repository,
      techStack: project.techStack,
      features: project.features,
      description: project.description,
      type: project.type
    };
    
    // If you have an agent context storage mechanism, use it here
    // For example, if agents need to access project context from a service:
    // await this.agentContextService.setProjectContext(project.id, agentContext);
    
    this.logger.log(`Agent context setup completed for project: ${project.id}`);
  } catch (error) {
    this.logger.error('Error setting up agent context:', error);
    throw error;
  }
}

  getDebugInfo() {
  return {
    totalProjects: this.projects.size,
    projectIds: Array.from(this.projects.keys()),
    hasAgentWorkService: !!this.agentWorkService,
    agentWorkServiceType: this.agentWorkService ? this.agentWorkService.constructor.name : null
  };
}

verifyProjectContext(projectId: string): { exists: boolean, project?: GeneratedProject } {
  const project = this.projects.get(projectId);
  return {
    exists: !!project,
    project: project
  };
}

  verifyProjectAndTask(projectId: string, taskId: string): { project?: GeneratedProject, task?: GeneratedTask } {
  const project = this.projects.get(projectId);
  if (!project) {
    this.logger.error(`Project ${projectId} not found`);
    this.logger.log(`Available projects: ${Array.from(this.projects.keys()).join(', ') || 'none'}`);
    return {};
  }

  const task = project.tasks.find(t => t.id === taskId);
  if (!task) {
    this.logger.error(`Task ${taskId} not found in project ${projectId}`);
    this.logger.log(`Available tasks in project: ${project.tasks.map(t => t.id).join(', ') || 'none'}`);
    return { project };
  }

  this.logger.log(`Verified project ${projectId} and task ${taskId}`);
  return { project, task };
}
}