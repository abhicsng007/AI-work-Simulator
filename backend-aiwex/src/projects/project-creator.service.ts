import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

// Services
import { ProjectQuestionsService } from './project-questions.service';
import { ProjectContextService } from './project-context.service';
import { ProjectGenerationService } from './project-generation.service';
import { TaskManagementService } from './task-management.service';
import { CodeGenerationService } from './code-generation.service';
import { GithubIntegrationService } from './github-integration.service';
import { UsersService } from '../users/users.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { AgentWorkService } from '../agents/agent-work.service';
// Interfaces
import { ProjectQuestion, ProjectAnswer, GeneratedProject, GeneratedTask } from './project.interface';



@Injectable()
export class ProjectCreatorService {
  private readonly logger = new Logger(ProjectCreatorService.name);

  constructor(
    // Specialized services
    private projectQuestionsService: ProjectQuestionsService,
    private projectContextService: ProjectContextService,
    private projectGenerationService: ProjectGenerationService,
    private taskManagementService: TaskManagementService,
    private codeGenerationService: CodeGenerationService,
    private githubIntegrationService: GithubIntegrationService,
    
    // External services
    private usersService: UsersService,
    private websocketGateway: WebsocketGateway,
    @Inject(forwardRef(() => AgentWorkService)) private agentWorkService: AgentWorkService,
  ) {}

  getQuestions(): ProjectQuestion[] {
    return this.projectQuestionsService.getQuestions();
  }

// Method to get all project contexts
/**
   * Main project generation orchestrator
   */
  async generateProject(userId: string, answers: ProjectAnswer[]): Promise<GeneratedProject> {
    const user = await this.usersService.getUserById(userId);
    if (!user) throw new Error('User not found');

    this.logger.log(`🚀 Starting project generation for user: ${userId}`);

    try {
      // 1. Extract project data from answers
      const projectData = this.projectQuestionsService.extractProjectData(answers);
      
      // 2. Generate AI-driven project plan
      const projectPlan = await this.projectGenerationService.generateProjectPlan(projectData, user);
      
      // 3. Create project object
      const project: GeneratedProject = {
        id: uuidv4(),
        name: projectPlan.name,
        description: projectPlan.description,
        type: projectData.type,
        repository: projectPlan.repository,
        features: projectPlan.features,
        techStack: projectPlan.techStack,
        timeline: projectPlan.timeline,
        tasks: projectPlan.tasks.map(task => ({
          ...task,
          id: uuidv4(),
        })),
        status: 'planning'
      };

      // 4. Store project context immediately
      this.projectContextService.storeProject(project);
      this.logger.log(`✅ Project context stored: ${project.id} - ${project.name}`);

      // 5. Initialize GitHub project
      await this.initializeGitHubProject(project, user);

      // 6. Generate initial project files
      await this.generateInitialFiles(project);

      // 7. Setup and execute tasks
      await this.setupProjectExecution(project, user);

      this.logger.log(`🎉 Project generation completed: ${project.name} (${project.id})`);
      return project;

    } catch (error) {
      this.logger.error('❌ Error in project generation:', error);
      throw error;
    }
  }

  /**
   * Get a specific project by ID
   */
  getProject(projectId: string): GeneratedProject | null {
    return this.projectContextService.getProjectContext(projectId);
  }

  /**
   * Get all projects for a user
   */
  getUserProjects(userId: string): GeneratedProject[] {
    return this.projectContextService.getUserProjects(userId);
  }

  /**
   * Update task status
   */
  updateTaskStatus(projectId: string, taskId: string, status: GeneratedTask['status']) {
    const project = this.projectContextService.getProjectContext(projectId);
    if (project) {
      this.taskManagementService.updateTaskStatus(project, taskId, status);
    }
  }

  /**
   * Get debug information about service state
   */
  getDebugInfo() {
    return {
      ...this.taskManagementService.getDebugInfo(),
      hasAgentWorkService: !!this.agentWorkService,
      agentWorkServiceType: this.agentWorkService ? this.agentWorkService.constructor.name : null
    };
  }

  // ============================================================================
  // CONTEXT MANAGEMENT METHODS (Delegated to services)
  // ============================================================================

  getAllProjectContexts(): string[] {
    return this.projectContextService.getAllProjectContexts();
  }

  getProjectContext(projectId: string): GeneratedProject | null {
    return this.projectContextService.getProjectContext(projectId);
  }

  verifyProjectAndTask(projectId: string, taskId: string): { project?: GeneratedProject, task?: GeneratedTask } {
    return this.projectContextService.verifyProjectAndTask(projectId, taskId);
  }

  validateAgentAccess(projectId: string, agentRole: string): boolean {
    return this.taskManagementService.validateAgentAccess(
      projectId, 
      agentRole, 
      this.projectContextService
    );
  }

  verifyProjectContext(projectId: string): { exists: boolean, project?: GeneratedProject } {
    return this.taskManagementService.verifyProjectContext(
      projectId, 
    );
  }

  // ============================================================================
  // PRIVATE ORCHESTRATION METHODS
  // ============================================================================

  /**
   * Initialize GitHub project setup
   */
  private async initializeGitHubProject(project: GeneratedProject, user: any): Promise<void> {
    try {
      this.logger.log(`🔗 Initializing GitHub project...`);
      await this.githubIntegrationService.initializeGitHubProject(project, user);
      this.logger.log(`✅ GitHub project initialized`);
    } catch (error) {
      this.logger.error('❌ GitHub initialization error:', error.message);
      this.websocketGateway.sendTaskUpdate(
        project.id, 
        'GitHub setup encountered issues, but project was created locally'
      );
    }
  }

  /**
   * Generate initial project files
   */
  private async generateInitialFiles(project: GeneratedProject): Promise<void> {
    try {
      this.logger.log(`📁 Generating initial project files...`);
      await this.projectGenerationService.generateInitialProjectFiles(project);
      this.logger.log(`✅ Initial project files generated`);
    } catch (error) {
      this.logger.error('❌ Error generating initial files:', error);
    }
  }

  /**
   * Setup project task execution and agent work
   */
  private async setupProjectExecution(project: GeneratedProject, user: any): Promise<void> {
    // Wait for GitHub setup to stabilize
    this.logger.log(`⏳ Waiting for GitHub setup to stabilize...`);
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Setup agent context
    await this.taskManagementService.setupAgentContext(project);

    // Execute project tasks
    await this.taskManagementService.executeProjectTasks(project, user);

    // Start AI agent work if there are AI tasks
    const aiTasks = project.tasks.filter(task => !task.assignedTo.startsWith('user-'));
    
    if (aiTasks.length > 0) {
      try {
        this.logger.log(`🤖 Starting agent work for ${aiTasks.length} AI tasks...`);
        
        if (!this.agentWorkService) {
          throw new Error('AgentWorkService not available');
        }

        await this.agentWorkService.startProjectWork(project.id, project.repository, aiTasks);
        this.logger.log(`✅ Agent work started successfully`);
        
      } catch (error) {
        this.logger.error('❌ Error starting agent work:', error);
        this.websocketGateway.sendTaskUpdate(
          project.id, 
          `Agent initialization error: ${error.message}. Project created but agents may not be working.`
        );
      }
    } else {
      this.logger.log(`ℹ️ No AI tasks to assign to agents`);
    }
  }
}