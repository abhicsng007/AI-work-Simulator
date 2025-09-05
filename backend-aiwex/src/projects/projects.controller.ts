import { Controller, Get, Post, Body, Param, Headers, Patch, Inject } from '@nestjs/common';
import { ProjectAnswer, GeneratedProject, GeneratedTask } from './project.interface';
import { UsersService } from '../users/users.service';
import { ProjectCreatorService } from './project-creator.service';

@Controller('projects')
export class ProjectsController {
  constructor(
    private projectCreatorService: ProjectCreatorService,
    @Inject(UsersService) private usersService: UsersService,
  ) {}

  // ========== YOUR EXISTING ENDPOINTS ==========
  
  @Get('questions')
  getProjectQuestions() {
    return this.projectCreatorService.getQuestions();
  }

  @Get('user/projects')
  async getUserProjects(@Headers('x-session-id') sessionId: string) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }
    return this.projectCreatorService.getUserProjects(user.id);
  }

  @Post('generate')
  async generateProject(
    @Headers('x-session-id') sessionId: string,
    @Body() data: { answers: ProjectAnswer[] }
  ) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }
    return this.projectCreatorService.generateProject(user.id, data.answers);
  }

  @Patch(':projectId/task/:taskId/status')
  updateTaskStatus(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() data: { status: 'todo' | 'in-progress' | 'review' | 'done' }
  ) {
    this.projectCreatorService.updateTaskStatus(projectId, taskId, data.status);
    return { success: true, message: 'Task status updated' };
  }

  // ========== DEBUG ENDPOINTS WITH FIXED TYPING ==========

  @Get('debug/contexts')
  getAllProjectContexts() {
    try {
      // Access the private projects Map with proper typing
      const projectsMap = (this.projectCreatorService as any)['projects'] as Map<string, GeneratedProject> | undefined;
      const projects = projectsMap ? Array.from(projectsMap.keys()) : [];
      
      return {
        success: true,
        totalProjects: projects.length,
        projectIds: projects,
        hasProjectsMap: !!projectsMap,
        mapSize: projectsMap ? projectsMap.size : 0,
        message: projects.length > 0 ? 'Projects found in context' : 'No projects in context'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { 
        success: false,
        error: errorMessage,
        totalProjects: 0 
      };
    }
  }

  @Get('debug/context/:projectId')
  getProjectContext(@Param('projectId') projectId: string) {
    try {
      // Try to get project context using the public method
      let context: GeneratedProject | null = null;
      
      if (typeof (this.projectCreatorService as any).getProjectContext === 'function') {
        context = (this.projectCreatorService as any).getProjectContext(projectId);
      } else {
        // If method doesn't exist, try to access directly
        const projectsMap = (this.projectCreatorService as any)['projects'] as Map<string, GeneratedProject> | undefined;
        if (projectsMap) {
          context = projectsMap.get(projectId) || null;
        }
      }

      return {
        found: !!context,
        projectId,
        context: context ? {
          name: context.name,
          description: context.description,
          tasksCount: context.tasks?.length || 0,
          status: context.status,
          repository: context.repository,
          techStack: context.techStack,
          features: context.features,
          aiTasks: context.tasks?.filter((t: GeneratedTask) => !t.assignedTo.startsWith('user-')).length || 0,
          userTasks: context.tasks?.filter((t: GeneratedTask) => t.assignedTo.startsWith('user-')).length || 0
        } : null
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { 
        found: false,
        projectId,
        error: errorMessage 
      };
    }
  }

  @Get('debug/verify/:projectId/:taskId')
  verifyProjectAndTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string
  ) {
    try {
      // Try using the public method first
      let result: { project?: GeneratedProject; task?: GeneratedTask } | null = null;
      
      if (typeof (this.projectCreatorService as any).verifyProjectAndTask === 'function') {
        result = (this.projectCreatorService as any).verifyProjectAndTask(projectId, taskId);
      } else {
        // Manual verification if method doesn't exist
        const projectsMap = (this.projectCreatorService as any)['projects'] as Map<string, GeneratedProject> | undefined;
        if (projectsMap) {
          const project = projectsMap.get(projectId);
          if (project) {
            const task = project.tasks.find((t: GeneratedTask) => t.id === taskId);
            result = { project, task };
          }
        }
      }

      return {
        projectFound: !!(result?.project),
        taskFound: !!(result?.task),
        projectId,
        taskId,
        projectName: result?.project?.name || null,
        taskTitle: result?.task?.title || null,
        taskAssignedTo: result?.task?.assignedTo || null,
        taskType: result?.task?.type || null,
        taskStatus: result?.task?.status || null
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { 
        projectFound: false,
        taskFound: false,
        projectId,
        taskId,
        error: errorMessage 
      };
    }
  }

  @Get('debug/all-projects-detailed')
  getAllProjectsDetailed() {
    try {
      const projectsMap = (this.projectCreatorService as any)['projects'] as Map<string, GeneratedProject> | undefined;
      
      if (!projectsMap) {
        return { 
          success: false,
          error: 'Projects map not available',
          totalProjects: 0,
          projects: []
        };
      }

      const projects: any[] = [];
      
      for (const [projectId, project] of projectsMap.entries()) {
        const allTasks = project.tasks || [];
        const aiTasks = allTasks.filter((t: GeneratedTask) => !t.assignedTo.startsWith('user-'));
        const userTasks = allTasks.filter((t: GeneratedTask) => t.assignedTo.startsWith('user-'));
        
        projects.push({
          id: projectId,
          name: project.name,
          description: project.description,
          status: project.status,
          repository: project.repository,
          techStack: project.techStack,
          features: project.features,
          totalTasks: allTasks.length,
          aiTasks: aiTasks.length,
          userTasks: userTasks.length,
          tasksByAgent: this.groupTasksByAgent(aiTasks),
          createdAt: (project as any).createdAt || 'Unknown'
        });
      }

      return {
        success: true,
        totalProjects: projects.length,
        projects
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { 
        success: false,
        error: errorMessage,
        totalProjects: 0,
        projects: []
      };
    }
  }

  @Post('debug/test-agent-integration/:projectId')
  testAgentIntegration(@Param('projectId') projectId: string) {
    try {
      // Get project context
      const projectsMap = (this.projectCreatorService as any)['projects'] as Map<string, GeneratedProject> | undefined;
      const project = projectsMap?.get(projectId);
      
      if (!project) {
        return {
          success: false,
          error: 'Project not found',
          projectId,
          availableProjects: projectsMap ? Array.from(projectsMap.keys()) : []
        };
      }

      // Get AI tasks
      const allTasks = project.tasks || [];
      const aiTasks = allTasks.filter((task: GeneratedTask) => !task.assignedTo.startsWith('user-'));
      
      return {
        success: true,
        projectId,
        projectName: project.name,
        projectStatus: project.status,
        repository: project.repository,
        totalTasks: allTasks.length,
        aiTasks: aiTasks.length,
        aiTaskDetails: aiTasks.map((task: GeneratedTask) => ({
          id: task.id,
          title: task.title,
          assignedTo: task.assignedTo,
          type: task.type,
          status: task.status,
          priority: task.priority,
          estimatedHours: task.estimatedHours
        })),
        tasksByAgent: this.groupTasksByAgent(aiTasks),
        readyForAgentWork: aiTasks.length > 0
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: errorMessage,
        projectId
      };
    }
  }

  @Get('debug/service-methods')
  getServiceMethods() {
    try {
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this.projectCreatorService));
      const publicMethods = methods.filter(method => !method.startsWith('_') && method !== 'constructor');
      
      return {
        success: true,
        totalMethods: publicMethods.length,
        methods: publicMethods,
        hasGetProjectContext: publicMethods.includes('getProjectContext'),
        hasVerifyProjectAndTask: publicMethods.includes('verifyProjectAndTask'),
        hasGetAllProjectContexts: publicMethods.includes('getAllProjectContexts'),
        serviceConstructorName: this.projectCreatorService.constructor.name
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Helper method to group tasks by agent with proper typing
  private groupTasksByAgent(tasks: GeneratedTask[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    for (const task of tasks) {
      const agentId = task.assignedTo;
      if (!agentId.startsWith('user-')) {
        grouped[agentId] = (grouped[agentId] || 0) + 1;
      }
    }

    return grouped;
  }

  // ========== KEEP YOUR EXISTING GET PROJECT ENDPOINT AT THE END ==========
  // (This should be last to avoid route conflicts with debug endpoints)
  
  @Get(':projectId')
  getProject(@Param('projectId') projectId: string) {
    return this.projectCreatorService.getProject(projectId);
  }
}