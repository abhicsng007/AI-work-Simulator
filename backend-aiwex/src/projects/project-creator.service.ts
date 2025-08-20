import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { OpenAIService } from '../openai/openai.service';
import { GithubService } from '../github/github.service';
import { GithubCollaborationService } from '../github/github-collaboration.service';
import { CollaborationService } from '../agents/collaboration/collaboration.service';
import { UsersService } from '../users/users.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { ConfigService } from '@nestjs/config';
import { AgentWorkService } from '../agents/agent-work.service';
import { v4 as uuidv4 } from 'uuid';

export interface ProjectQuestion {
  id: string;
  question: string;
  type: 'select' | 'text' | 'multiselect';
  options?: string[];
}

export interface ProjectAnswer {
  questionId: string;
  answer: string | string[];
}

export interface GeneratedProject {
  id: string;
  name: string;
  description: string;
  type: string;
  repository: string;
  features: string[];
  techStack: string[];
  timeline: string;
  tasks: GeneratedTask[];
  status: 'planning' | 'in-progress' | 'completed';
}

export interface GeneratedTask {
  id: string;
  title: string;
  description: string;
  type: 'feature' | 'bug' | 'design' | 'test' | 'documentation';
  assignedTo: string;
  priority: 'low' | 'medium' | 'high';
  estimatedHours: number;
  dependencies: string[];
  status: 'todo' | 'in-progress' | 'review' | 'done';
  githubIssueNumber?: number;
  files?: GeneratedFile[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

@Injectable()
export class ProjectCreatorService {
  private readonly logger = new Logger(ProjectCreatorService.name);
  private projects = new Map<string, GeneratedProject>();
  private projectQuestions: ProjectQuestion[] = [
    {
      id: 'project-type',
      question: 'What type of project would you like to build?',
      type: 'select',
      options: [
        'Web Application',
        'Mobile App',
        'API/Backend Service',
        'E-commerce Platform',
        'Social Media App',
        'Dashboard/Analytics Tool',
        'Game',
        'AI/ML Application'
      ]
    },
    {
      id: 'project-purpose',
      question: 'What is the main purpose of your project?',
      type: 'text'
    },
    {
      id: 'target-users',
      question: 'Who are your target users?',
      type: 'text'
    },
    {
      id: 'core-features',
      question: 'Select the core features you need:',
      type: 'multiselect',
      options: [
        'User Authentication',
        'Payment Processing',
        'Real-time Chat',
        'File Upload/Storage',
        'Search Functionality',
        'Notifications',
        'Admin Panel',
        'API Integration',
        'Data Visualization',
        'Social Features'
      ]
    },
    {
      id: 'tech-preference',
      question: 'Do you have any technology preferences?',
      type: 'select',
      options: [
        'Modern (React/Node.js)',
        'Enterprise (Java/Spring)',
        'Microsoft (.NET/C#)',
        'Python-based',
        'No preference - recommend best fit'
      ]
    },
    {
      id: 'timeline',
      question: 'What is your expected timeline?',
      type: 'select',
      options: [
        '1 week (MVP)',
        '2-4 weeks (Basic)',
        '1-2 months (Standard)',
        '3+ months (Complex)'
      ]
    },
    {
      id: 'team-size',
      question: 'How would you like to participate?',
      type: 'select',
      options: [
        'I want to code actively',
        'I want to manage and review',
        'I want to test and provide feedback',
        'I want to observe and learn'
      ]
    }
  ];

  constructor(
    private openAIService: OpenAIService,
    private githubService: GithubService,
    private githubCollabService: GithubCollaborationService,
    private collaborationService: CollaborationService,
    private usersService: UsersService,
    private websocketGateway: WebsocketGateway,
    private configService: ConfigService,
    @Inject(forwardRef(() => AgentWorkService)) private agentWorkService: AgentWorkService,
  ) {}

  getQuestions(): ProjectQuestion[] {
    return this.projectQuestions;
  }

  // Add these methods to your ProjectCreatorService if they don't exist:

// Method to get all project contexts
getAllProjectContexts(): string[] {
  const projectIds = Array.from(this.projects.keys());
  this.logger.log(`Currently stored project contexts: ${projectIds.join(', ') || 'none'}`);
  return projectIds;
}

// Method to get a specific project context
getProjectContext(projectId: string): GeneratedProject | null {
  const project = this.projects.get(projectId);
  if (!project) {
    this.logger.error(`Project context not found for ID: ${projectId}`);
    this.logger.log(`Available projects: ${Array.from(this.projects.keys()).join(', ') || 'none'}`);
    return null;
  }
  this.logger.log(`Project context found for: ${projectId} - ${project.name}`);
  return project;
}

// Method to verify both project and task exist
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

// Enhanced generateProject method with better context storage and agent integration
async generateProject(userId: string, answers: ProjectAnswer[]): Promise<GeneratedProject> {
  const user = await this.usersService.getUserById(userId);
  if (!user) throw new Error('User not found');

  this.logger.log(`🚀 Starting project generation for user: ${userId}`);

  // Create project based on answers
  const projectData = this.extractProjectData(answers);
  
  // Use AI to generate detailed project plan
  const projectPlan = await this.generateProjectPlan(projectData, user);
  
  // Create the project
  const project: GeneratedProject = {
    id: uuidv4(),
    name: projectPlan.name,
    description: projectPlan.description,
    type: projectData.type,
    repository: projectPlan.repository,
    features: projectPlan.features,
    techStack: projectPlan.techStack,
    timeline: projectData.timeline,
    tasks: projectPlan.tasks.map(task => ({
      ...task,
      id: uuidv4(),
    })),
    status: 'planning'
  };

  // CRITICAL: Store project context IMMEDIATELY
  this.projects.set(project.id, project);
  this.logger.log(`✅ Project context stored for: ${project.id} - ${project.name}`);
  this.logger.log(`📊 Total projects in context: ${this.projects.size}`);
  this.logger.log(`📋 Project has ${project.tasks.length} tasks`);
  
  // Log AI tasks
  const aiTasks = project.tasks.filter(task => !task.assignedTo.startsWith('user-'));
  this.logger.log(`🤖 AI tasks: ${aiTasks.length}`);
  aiTasks.forEach(task => {
    this.logger.log(`   - ${task.title} (${task.assignedTo})`);
  });

  try {
    // Initialize project on GitHub
    this.logger.log(`🔗 Initializing GitHub project...`);
    await this.initializeGitHubProject(project, user);
    this.logger.log(`✅ GitHub project initialized`);
  } catch (error) {
    this.logger.error('❌ GitHub initialization error:', error.message);
    this.websocketGateway.sendTaskUpdate(project.id, 'GitHub setup encountered issues, but project was created locally');
  }

  try {
    // Generate initial project structure
    this.logger.log(`📁 Generating initial project files...`);
    await this.generateInitialProjectFiles(project);
    this.logger.log(`✅ Initial project files generated`);
  } catch (error) {
    this.logger.error('❌ Error generating initial files:', error);
  }

  // Wait for GitHub setup to complete
  this.logger.log(`⏳ Waiting for GitHub setup to stabilize...`);
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Start AI agents working on their tasks
  if (aiTasks.length > 0) {
    try {
      this.logger.log(`🤖 Starting agent work for ${aiTasks.length} AI tasks...`);
      
      // Verify agentWorkService is available
      if (!this.agentWorkService) {
        throw new Error('AgentWorkService not available');
      }

      // Start the agent work
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

  this.logger.log(`🎉 Project generation completed: ${project.name} (${project.id})`);
  return project;
}

// Method to get debug information about the service state
getDebugInfo() {
  return {
    totalProjects: this.projects.size,
    projectIds: Array.from(this.projects.keys()),
    hasAgentWorkService: !!this.agentWorkService,
    agentWorkServiceType: this.agentWorkService ? this.agentWorkService.constructor.name : null
  };
}
  // Fix for the agent context issues - Add/Update these methods in ProjectCreatorService

// 1. Update the generateProject method to ensure proper agent context setup




// 2. Add method to setup agent context properly
private async setupAgentContext(project: GeneratedProject): Promise<void> {
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

// 3. Update executeProjectTasks to handle agent context better
private async executeProjectTasks(project: GeneratedProject, user: any) {
  this.logger.log(`Executing tasks for project: ${project.id}`);
  
  const sortedTasks = this.sortTasksByDependencies(project.tasks);

  for (const task of sortedTasks) {
    if (!task.assignedTo.startsWith('user-')) {
      // Schedule agent task with proper context
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

// 4. Update scheduleAgentTask to include context validation
private scheduleAgentTaskWithContext(project: GeneratedProject, task: GeneratedTask) {
  const delay = Math.min(task.estimatedHours * 2000, 60000); // Max 60 seconds
  
  setTimeout(async () => {
    try {
      // Validate project context exists
      const projectContext = this.projects.get(project.id);
      if (!projectContext) {
        this.logger.error(`Project context not found for project: ${project.id}`);
        this.websocketGateway.sendTaskUpdate(task.id, `Error: Project context not found for ${task.title}`);
        return;
      }

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
            await this.createAgentPullRequestWithCode(project, task);
          }
        } catch (error) {
          this.logger.error(`Error completing task ${task.id}:`, error);
          task.status = 'todo'; // Reset status on error
          this.websocketGateway.sendTaskUpdate(task.id, `Error completing ${task.title}: ${error.message}`);
        }
      }, delay);
    } catch (error) {
      this.logger.error(`Error starting task ${task.id}:`, error);
      this.websocketGateway.sendTaskUpdate(task.id, `Error starting ${task.title}: ${error.message}`);
    }
  }, 5000);
}

// 5. Add context validation to task code generation
private async generateTaskCodeWithContext(project: GeneratedProject, task: GeneratedTask): Promise<GeneratedFile[]> {
  try {
    // Validate project context
    const projectContext = this.projects.get(project.id);
    if (!projectContext) {
      throw new Error(`Project context not found for project: ${project.id}`);
    }

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

    // Generate code with full context
    const prompt = `Generate code files for this development task with full project context:

EXISTING PROJECT CONTEXT:
- Project ID: ${project.id}
- Name: ${project.name}
- Type: ${project.type}
- Repository: ${project.repository}
- Tech Stack: ${project.techStack.join(', ')}
- Existing Features: ${project.features.join(', ')}
- Project Description: ${project.description}

TASK TO IMPLEMENT:
- Task ID: ${task.id}
- Title: ${task.title}
- Description: ${task.description}
- Type: ${task.type}
- Assigned to: ${task.assignedTo}
- Priority: ${task.priority}
- Estimated Hours: ${task.estimatedHours}

REQUIREMENTS:
1. Generate multiple related files for this specific task
2. Follow the project's existing architecture and patterns
3. Create files in appropriate folders based on the tech stack
4. Include proper error handling, validation, and logging
5. Add comprehensive comments explaining the implementation
6. Include unit tests for the new functionality
7. Make the code production-ready, not just placeholder code
8. Ensure compatibility with the existing project structure

Return ONLY a JSON object with this structure:
{
  "files": [
    {
      "path": "relative/path/to/file.ext",
      "content": "complete functional code content...",
      "description": "brief description of what this file does"
    }
  ]
}

Generate 3-8 files that completely implement the requested feature.`;

    const response = await this.openAIService.generateProjectStructure(prompt);
    
    let files: GeneratedFile[] = [];
    
    if (response.files && Array.isArray(response.files)) {
      files = response.files.map(file => ({
        path: file.path || `src/${task.title.toLowerCase().replace(/\s+/g, '-')}.js`,
        content: file.content || '',
        language: this.inferLanguageFromPath(file.path || '')
      }));
    }

    // If no files generated, create fallback
    if (files.length === 0) {
      files = await this.generateFallbackTaskFiles(project, task);
    }

    this.logger.log(`Generated ${files.length} files for task: ${task.title}`);
    return files;

  } catch (error) {
    this.logger.error('Error generating task code with context:', error);
    return await this.generateFallbackTaskFiles(project, task);
  }
}

// 7. Add method to validate agent can work on project
validateAgentAccess(projectId: string, agentRole: string): boolean {
  const project = this.projects.get(projectId);
  if (!project) {
    this.logger.error(`Cannot validate agent access: Project ${projectId} not found`);
    return false;
  }

  // Check if there are tasks for this agent role
  const agentTasks = project.tasks.filter(task => task.assignedTo === agentRole);
  if (agentTasks.length === 0) {
    this.logger.warn(`No tasks found for agent ${agentRole} in project ${projectId}`);
    return false;
  }

  return true;
}

// 8. Add debugging method to list all stored projects

// 9. Add method that AgentWorkService can call to verify context
verifyProjectContext(projectId: string): { exists: boolean, project?: GeneratedProject } {
  const project = this.projects.get(projectId);
  return {
    exists: !!project,
    project: project
  };
}

  // Replace the existing methods with these AI-driven approaches

private async generateInitialProjectFiles(project: GeneratedProject): Promise<void> {
  this.logger.log(`Generating AI-driven project structure for: ${project.name}`);
  
  try {
    const username = this.configService.get<string>('GITHUB_USERNAME');
    if (!username) {
      throw new Error('GitHub username not configured');
    }

    // Let AI generate the complete project structure
    const projectFiles = await this.generateAIProjectStructure(project);
    
    if (projectFiles.length === 0) {
      this.logger.warn('AI generated no files, falling back to basic structure');
      projectFiles.push(...this.generateMinimalFallback(project));
    }

    // Create files in batches to avoid API limits
    const batches = this.chunkArray(projectFiles, 5);
    
    for (const batch of batches) {
      const fileOperations = batch.map(file => ({
        path: file.path,
        content: file.content,
        message: `Add ${file.path}`
      }));
      
      await this.githubService.createMultipleFiles(
        username,
        project.repository,
        fileOperations,
        'main'
      );
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.logger.log(`Successfully created ${projectFiles.length} AI-generated files`);
  } catch (error) {
    this.logger.error('Error generating initial project files:', error);
  }
}

private async generateAIProjectStructure(project: GeneratedProject): Promise<Array<{path: string, content: string}>> {
  try {
    const prompt = `Generate a complete project structure for this application:

PROJECT DETAILS:
- Name: ${project.name}
- Type: ${project.type}
- Description: ${project.description}
- Tech Stack: ${project.techStack.join(', ')}
- Features: ${project.features.join(', ')}
- Timeline: ${project.timeline}

REQUIREMENTS:
1. Create a comprehensive file structure appropriate for this specific project type and tech stack
2. Generate ALL necessary files including:
   - Configuration files (package.json, .env.example, etc.)
   - Source code files with proper folder organization
   - Documentation files (README.md, API docs, etc.)
   - Test files and testing setup
   - Build/deployment configuration files
   - Style files (CSS, SCSS, etc.) if needed
   - Database schema/models if applicable
   - Docker files if containerization is beneficial

3. Each file should contain functional, production-ready code (not just TODOs)
4. Follow industry best practices for the chosen tech stack
5. Organize files in a logical folder structure
6. Include proper imports, exports, and dependencies
7. Add error handling, logging, and validation where appropriate
8. Include environment configuration and security best practices

IMPORTANT: Return a JSON array of file objects with this exact structure:
{
  "files": [
    {
      "path": "relative/path/to/file.ext",
      "content": "actual file content here..."
    }
  ]
}

Generate between 15-30 files for a complete, production-ready project structure.`;

    const response = await this.openAIService.generateProjectStructure(prompt);
    
    if (response.files && Array.isArray(response.files)) {
      return response.files.map(file => ({
        path: file.path || 'src/index.js',
        content: file.content || ''
      }));
    }

    // If the response format is different, try to extract files
    if (Array.isArray(response)) {
      return response.map(file => ({
        path: file.path || 'src/index.js',
        content: file.content || ''
      }));
    }

    this.logger.warn('AI response did not contain files array');
    return [];

  } catch (error) {
    this.logger.error('Error generating AI project structure:', error);
    return [];
  }
}

private async generateTaskCode(project: GeneratedProject, task: GeneratedTask): Promise<GeneratedFile[]> {
  try {
    const prompt = `Generate code files for this specific development task in the context of an existing project:

EXISTING PROJECT CONTEXT:
- Name: ${project.name}
- Type: ${project.type}
- Tech Stack: ${project.techStack.join(', ')}
- Existing Features: ${project.features.join(', ')}

TASK TO IMPLEMENT:
- Title: ${task.title}
- Description: ${task.description}
- Type: ${task.type}
- Priority: ${task.priority}
- Estimated Hours: ${task.estimatedHours}

REQUIREMENTS:
1. Generate multiple related files for this specific task
2. Follow the project's existing architecture and patterns
3. Create files in appropriate folders based on the tech stack
4. Include proper error handling, validation, and logging
5. Add comprehensive comments explaining the implementation
6. Include unit tests for the new functionality
7. Update existing files if integration is required
8. Follow security best practices
9. Make the code production-ready, not just placeholder code

EXAMPLES OF FILE TYPES TO GENERATE:
- Main implementation files (components, controllers, services, etc.)
- Test files (unit tests, integration tests)
- Style files (if UI-related)
- Configuration files (if needed)
- Migration files (if database changes required)
- Documentation files
- Type definition files (if TypeScript)

Return ONLY a JSON object with this structure:
{
  "files": [
    {
      "path": "relative/path/to/file.ext",
      "content": "complete functional code content...",
      "description": "brief description of what this file does"
    }
  ]
}

Generate 3-8 files that completely implement the requested feature.`;

    const response = await this.openAIService.generateProjectStructure(prompt);
    
    let files: GeneratedFile[] = [];
    
    if (response.files && Array.isArray(response.files)) {
      files = response.files.map(file => ({
        path: file.path || `src/${task.title.toLowerCase().replace(/\s+/g, '-')}.js`,
        content: file.content || '',
        language: this.inferLanguageFromPath(file.path || '')
      }));
    } else if (Array.isArray(response)) {
      files = response.map(file => ({
        path: file.path || `src/${task.title.toLowerCase().replace(/\s+/g, '-')}.js`,
        content: file.content || '',
        language: this.inferLanguageFromPath(file.path || '')
      }));
    }

    // If AI didn't generate multiple files, make another attempt with more specific prompt
    if (files.length <= 1) {
      const specificPrompt = `Create multiple separate files for implementing "${task.title}" in a ${project.techStack.join(', ')} project.

Task: ${task.description}

Generate at least 3 files:
1. Main implementation file
2. Test file  
3. Additional supporting file (config, styles, utils, etc.)

Return as JSON array with path and content for each file.`;

      const specificResponse = await this.openAIService.generateProjectStructure(specificPrompt);
      
      if (specificResponse.files && Array.isArray(specificResponse.files)) {
        files = specificResponse.files.map(file => ({
          path: file.path || `src/${task.title.toLowerCase().replace(/\s+/g, '-')}.js`,
          content: file.content || '',
          language: this.inferLanguageFromPath(file.path || '')
        }));
      }
    }

    // Final fallback - create minimal structure if AI still doesn't provide multiple files
    if (files.length === 0) {
      files = await this.generateFallbackTaskFiles(project, task);
    }

    return files;

  } catch (error) {
    this.logger.error('Error generating task code:', error);
    return await this.generateFallbackTaskFiles(project, task);
  }
}

private async generateFallbackTaskFiles(project: GeneratedProject, task: GeneratedTask): Promise<GeneratedFile[]> {
  const taskSlug = task.title.toLowerCase().replace(/\s+/g, '-');
  
  // Use AI for fallback too, but with simpler prompt
  try {
    const fallbackPrompt = `Create 3 basic files for "${task.title}" task in ${project.techStack.join(' ')} project:
1. Main file for the feature
2. Test file
3. Documentation/README file

Return JSON with files array containing path and content.`;

    const response = await this.openAIService.generateProjectStructure(fallbackPrompt);
    
    if (response.files && Array.isArray(response.files)) {
      return response.files.map(file => ({
        path: file.path || `src/${taskSlug}.js`,
        content: file.content || `// ${task.title}\n// ${task.description}\n\n// TODO: Implement ${task.title}`,
        language: this.inferLanguageFromPath(file.path || '')
      }));
    }
  } catch (error) {
    this.logger.error('Fallback file generation failed:', error);
  }

  // Ultimate fallback - minimal files
  return [
    {
      path: `src/${taskSlug}.js`,
      content: `// ${task.title}\n// ${task.description}\n\n// TODO: Implement ${task.title}\nconsole.log('${task.title} - To be implemented');`,
      language: 'javascript'
    },
    {
      path: `tests/${taskSlug}.test.js`,
      content: `// Tests for ${task.title}\n\ndescribe('${task.title}', () => {\n  test('should implement ${task.title}', () => {\n    // TODO: Add tests\n    expect(true).toBe(true);\n  });\n});`,
      language: 'javascript'
    }
  ];
}

private generateMinimalFallback(project: GeneratedProject): Array<{path: string, content: string}> {
  return [
    {
      path: 'README.md',
      content: `# ${project.name}\n\n${project.description}\n\n## Features\n${project.features.map(f => `- ${f}`).join('\n')}\n\n## Tech Stack\n${project.techStack.map(t => `- ${t}`).join('\n')}`
    },
    {
      path: '.gitignore',
      content: 'node_modules/\n.env\n.DS_Store\nlogs/\n*.log'
    },
    {
      path: 'package.json',
      content: JSON.stringify({
        name: project.repository,
        version: "1.0.0",
        description: project.description,
        main: "index.js",
        scripts: {
          start: "node index.js",
          test: "jest"
        },
        dependencies: {},
        devDependencies: {
          jest: "^29.0.0"
        }
      }, null, 2)
    }
  ];
}

// Enhanced OpenAI service method call - make sure this method exists in your OpenAIService
// If it doesn't exist, you might need to create it or modify existing methods

private async callOpenAIForProjectGeneration(prompt: string): Promise<any> {
  try {
    // This should call your OpenAI service with a more specific method for project generation
    // Adjust this based on your actual OpenAIService implementation
    return await this.openAIService.generateProjectStructure(prompt);
  } catch (error) {
    this.logger.error('OpenAI API call failed:', error);
    throw error;
  }
}

// Utility method to chunk arrays (keep this)
private chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Enhanced method to create agent PRs with proper file structure
private async createAgentPullRequestWithCode(project: GeneratedProject, task: GeneratedTask) {
  const username = this.configService.get<string>('GITHUB_USERNAME');
  if (!username) {
    throw new Error('GitHub username not configured');
  }
  
  const branchName = `feature/${task.title.toLowerCase().replace(/\s+/g, '-')}`;
  
  try {
    // Create branch
    await this.githubCollabService.createBranch(
      username,
      project.repository,
      branchName,
      'develop'
    );

    // Generate code files using AI
    if (!task.files || task.files.length === 0) {
      task.files = await this.generateTaskCode(project, task);
    }

    // Prepare files for GitHub service
    const filesToCommit = task.files.map(file => ({
      path: file.path,
      content: file.content,
      message: `Add ${file.path} for ${task.title}`
    }));

    this.logger.log(`Committing ${filesToCommit.length} AI-generated files for task: ${task.title}`);

    // Commit files to branch
    if (filesToCommit.length > 0) {
      if (filesToCommit.length <= 5) {
        // Use API for small number of files
        for (const file of filesToCommit) {
          await this.githubService.createOrUpdateFile(
            username,
            project.repository,
            file.path,
            file.content,
            file.message,
            branchName
          );
          // Small delay between file creations
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else {
        // Use batch method for multiple files
        const fileOperations = filesToCommit.map(file => ({
          path: file.path,
          content: file.content,
          message: file.message
        }));
        
        await this.githubService.createMultipleFiles(
          username,
          project.repository,
          fileOperations,
          branchName
        );
      }

      this.logger.log(`Successfully committed ${filesToCommit.length} files to branch ${branchName}`);
    }

    // Wait for GitHub to process commits
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Create pull request
    const prDescription = `Implementation of ${task.title}

**Task Description:** ${task.description}

**Files Created:**
${task.files?.map(f => `- \`${f.path}\``).join('\n') || 'No files listed'}

**Estimated Development Time:** ${task.estimatedHours} hours

This PR was automatically generated by the ${task.assignedTo} AI agent.`;

    const pr = await this.githubCollabService.createPullRequest(
      username,
      project.repository,
      task.title,
      prDescription,
      branchName,
      'develop',
      [],
      [task.type, 'ai-generated', `priority-${task.priority}`]
    );

    this.websocketGateway.sendPullRequestCreated({
      projectId: project.id,
      taskId: task.id,
      prNumber: pr.number,
      prUrl: pr.html_url
    });

    this.logger.log(`Successfully created PR #${pr.number} for task: ${task.title}`);
  } catch (error) {
    this.logger.error('Error creating agent PR with AI-generated code:', error);
    this.websocketGateway.sendTaskUpdate(task.id, `Error creating PR for ${task.title}: ${error.message}`);
  }
}


  private extractProjectData(answers: ProjectAnswer[]) {
    const getAnswer = (id: string) => {
      const answer = answers.find(a => a.questionId === id);
      return answer?.answer || '';
    };

    return {
      type: getAnswer('project-type') as string,
      purpose: getAnswer('project-purpose') as string,
      targetUsers: getAnswer('target-users') as string,
      features: getAnswer('core-features') as string[],
      techPreference: getAnswer('tech-preference') as string,
      timeline: getAnswer('timeline') as string,
      participation: getAnswer('team-size') as string
    };
  }

  private async generateProjectPlan(projectData: any, user: any) {
    const prompt = `Generate a detailed project plan based on:
    - Type: ${projectData.type}
    - Purpose: ${projectData.purpose}
    - Target Users: ${projectData.targetUsers}
    - Features: ${projectData.features.join(', ')}
    - Tech Preference: ${projectData.techPreference}
    - Timeline: ${projectData.timeline}
    - User Role: ${user.role}
    - User Participation: ${projectData.participation}

    Create a JSON response with:
    {
      "name": "Project name",
      "description": "Detailed description",
      "repository": "repo-name",
      "features": ["feature1", "feature2"],
      "techStack": ["tech1", "tech2"],
      "tasks": [
        {
          "title": "Task title",
          "description": "Task description",
          "type": "feature|bug|design|test|documentation",
          "assignedTo": "developer|designer|qa|manager|user-${user.role}",
          "priority": "high|medium|low",
          "estimatedHours": number,
          "dependencies": []
        }
      ]
    }
    
    Assign tasks based on:
    - Developer agents: coding tasks
    - Designer agents: UI/UX tasks
    - QA agents: testing tasks
    - Manager agents: planning tasks
    - User (${user.role}): appropriate tasks for their role and skill level
    
    For ${user.role}, assign ${this.getTaskCountForRole(user.role)} tasks that match their permissions and experience level.`;

    const response = await this.openAIService.generateProjectStructure(prompt);
    return {
      ...response,
      tasks: response.tasks || []
    };
  }

  
  // Add this new method to generate basic project structure
  private async createBasicProjectStructure(project: GeneratedProject): Promise<Array<{path: string, content: string}>> {
    const files: Array<{path: string, content: string}> = [];
    
    // Generate README.md
    files.push({
      path: 'README.md',
      content: this.generateReadmeContent(project)
    });

    // Generate .gitignore
    files.push({
      path: '.gitignore',
      content: this.generateGitignoreContent(project.techStack)
    });

    // Generate package.json for Node.js projects
    if (project.techStack.some(tech => tech.toLowerCase().includes('node') || tech.toLowerCase().includes('react'))) {
      files.push({
        path: 'package.json',
        content: this.generatePackageJsonContent(project)
      });
    }

    // Try to generate additional files using AI
    try {
      const aiPrompt = `Generate initial project structure for:
Project: ${project.name}
Type: ${project.type}
Tech Stack: ${project.techStack.join(', ')}
Features: ${project.features.join(', ')}

Create basic source files and configuration files appropriate for this tech stack.`;
      
      // Use your existing generateProjectStructure method
      const aiResponse = await this.openAIService.generateProjectStructure(aiPrompt);
      
      if (aiResponse.files && Array.isArray(aiResponse.files)) {
        const aiFiles = aiResponse.files.map(file => ({
          path: file.path || 'src/index.js',
          content: file.content || ''
        }));
        files.push(...aiFiles);
      }
    } catch (error) {
      this.logger.warn('AI file generation failed, using basic structure only:', error);
    }

    return files;
  }
  
   private inferLanguageFromPath(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase();
    if (!extension) return 'text';
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'jsx', 
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown'
    };
    return languageMap[extension] || 'text';
  }

  private getLanguageFromTechStack(techStack: string[]): string {
    const stack = techStack.join(' ').toLowerCase();
    
    if (stack.includes('react') || stack.includes('javascript') || stack.includes('node')) {
      return 'javascript';
    }
    if (stack.includes('typescript')) {
      return 'typescript';
    }
    if (stack.includes('python')) {
      return 'python';
    }
    if (stack.includes('java')) {
      return 'java';
    }
    
    return 'javascript';
  }

  private getExtensionForLanguage(language: string): string {
    const extensions = {
      'javascript': 'js',
      'typescript': 'ts',
      'jsx': 'jsx',
      'tsx': 'tsx',
      'python': 'py',
      'java': 'java',
      'html': 'html',
      'css': 'css'
    };
    return extensions[language] || 'js';
  }

  private generateReadmeContent(project: GeneratedProject): string {
    return `# ${project.name}

${project.description}

## Features
${project.features.map(feature => `- ${feature}`).join('\n')}

## Tech Stack
${project.techStack.map(tech => `- ${tech}`).join('\n')}

## Getting Started

1. Clone the repository
\`\`\`bash
git clone https://github.com/[username]/${project.repository}.git
cd ${project.repository}
\`\`\`

2. Install dependencies
\`\`\`bash
npm install
\`\`\`

3. Run the development server
\`\`\`bash
npm start
\`\`\`

## Project Structure

Generated by AIWEX - AI-Powered Development Platform

## Tasks
${project.tasks.map(task => `- [ ] ${task.title} (${task.assignedTo})`).join('\n')}

## Contributing

This project is managed by AI agents. Pull requests are automatically created for feature development.
`;
  }

  private generateGitignoreContent(techStack: string[]): string {
    let content = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Temporary files
temp-repos/
*.tmp
*.temp

# Logs
logs
*.log
`;

    if (techStack.some(tech => tech.toLowerCase().includes('react') || tech.toLowerCase().includes('node'))) {
      content += `
# React/Node.js specific
build/
dist/
coverage/
.nyc_output/
`;
    }

    if (techStack.some(tech => tech.toLowerCase().includes('python'))) {
      content += `
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
.venv/
`;
    }

    return content;
  }

  private generatePackageJsonContent(project: GeneratedProject): string {
    const packageJson = {
      name: project.repository,
      version: "1.0.0",
      description: project.description,
      main: "index.js",
      scripts: {
        start: "node index.js",
        dev: "nodemon index.js",
        test: "jest",
        build: "npm run build"
      },
      dependencies: {},
      devDependencies: {
        nodemon: "^3.0.0",
        jest: "^29.0.0"
      },
      keywords: project.features,
      author: "AIWEX AI Agent",
      license: "MIT"
    };

    // Add dependencies based on features
    if (project.features.includes('User Authentication')) {
      packageJson.dependencies['bcrypt'] = '^5.1.0';
      packageJson.dependencies['jsonwebtoken'] = '^9.0.0';
    }

    if (project.features.includes('API Integration')) {
      packageJson.dependencies['axios'] = '^1.6.0';
    }

    if (project.techStack.some(tech => tech.toLowerCase().includes('express'))) {
      packageJson.dependencies['express'] = '^4.18.0';
    }

    if (project.techStack.some(tech => tech.toLowerCase().includes('react'))) {
      packageJson.dependencies['react'] = '^18.2.0';
      packageJson.dependencies['react-dom'] = '^18.2.0';
      packageJson.scripts.start = 'react-scripts start';
      packageJson.scripts.build = 'react-scripts build';
    }

    return JSON.stringify(packageJson, null, 2);
  }


  private async generateProjectStructure(project: GeneratedProject): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];
    
    // Generate README.md
    files.push({
      path: 'README.md',
      content: this.generateReadmeContent(project),
      language: 'markdown'
    });

    // Generate .gitignore
    files.push({
      path: '.gitignore',
      content: this.generateGitignoreContent(project.techStack),
      language: 'text'
    });

    // Generate package.json for Node.js projects
    if (project.techStack.some(tech => tech.toLowerCase().includes('node') || tech.toLowerCase().includes('react'))) {
      files.push({
        path: 'package.json',
        content: this.generatePackageJsonContent(project),
        language: 'json'
      });
    }

    // Generate basic project structure files based on tech stack
    const structureFiles = await this.generateTechStackFiles(project);
    files.push(...structureFiles);

    return files;
  }

 

  
  
  private async generateTechStackFiles(project: GeneratedProject): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate basic app structure
    if (project.techStack.some(tech => tech.toLowerCase().includes('react'))) {
      files.push({
        path: 'src/App.js',
        content: this.generateReactAppContent(project),
        language: 'javascript'
      });

      files.push({
        path: 'public/index.html',
        content: this.generateIndexHtmlContent(project),
        language: 'html'
      });
    }

    if (project.techStack.some(tech => tech.toLowerCase().includes('express') || tech.toLowerCase().includes('node'))) {
      files.push({
        path: 'index.js',
        content: this.generateExpressServerContent(project),
        language: 'javascript'
      });
    }

    return files;
  }

  private generateReactAppContent(project: GeneratedProject): string {
    return `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>${project.name}</h1>
        <p>${project.description}</p>
        <div className="features">
          <h2>Features:</h2>
          <ul>
            ${project.features.map(feature => `<li>${feature}</li>`).join('\n            ')}
          </ul>
        </div>
      </header>
    </div>
  );
}

export default App;
`;
  }

  private generateIndexHtmlContent(project: GeneratedProject): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name}</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>
`;
  }

  private generateExpressServerContent(project: GeneratedProject): string {
    return `const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({
    name: '${project.name}',
    description: '${project.description}',
    features: ${JSON.stringify(project.features, null, 2)},
    status: 'Running'
  });
});

${project.features.includes('User Authentication') ? `
// Authentication routes
app.post('/api/auth/register', (req, res) => {
  // TODO: Implement user registration
  res.json({ message: 'Registration endpoint - To be implemented' });
});

app.post('/api/auth/login', (req, res) => {
  // TODO: Implement user login
  res.json({ message: 'Login endpoint - To be implemented' });
});
` : ''}

${project.features.includes('API Integration') ? `
// API routes
app.get('/api/data', (req, res) => {
  // TODO: Implement data fetching
  res.json({ message: 'Data endpoint - To be implemented' });
});
` : ''}

app.listen(PORT, () => {
  console.log(\`${project.name} server running on port \${PORT}\`);
});

module.exports = app;
`;
  }

  private getTaskCountForRole(role: string): string {
    const taskCounts = {
      'junior-developer': '2-3 simple coding tasks',
      'senior-developer': '3-4 complex features',
      'qa-engineer': '2-3 testing tasks',
      'product-manager': '2-3 planning and review tasks',
      'ui-ux-designer': '2-3 design tasks',
      'team-lead': '2-3 architecture and review tasks',
      'devops-engineer': '2-3 infrastructure tasks'
    };
    return taskCounts[role] || '2-3 tasks';
  }

  private async initializeGitHubProject(project: GeneratedProject, user: any) {
    const username = this.configService.get<string>('GITHUB_USERNAME');
    if (!username) {
      throw new Error('GitHub username not configured');
    }
    
    // Create repository
    const repo = await this.githubService.createRepository(
      project.repository,
      project.description
    );

    // Create develop branch
    await this.githubCollabService.createBranch(
      username,
      project.repository,
      'develop',
      'main'
    );

    // Create milestone
    const milestone = await this.githubCollabService.createMilestone(
      username,
      project.repository,
      `${project.name} - Phase 1`,
      'Initial development phase',
      this.calculateDeadline(project.timeline)
    );

    // Create issues for each task
    for (const task of project.tasks) {
      const labels = [task.type, `priority-${task.priority}`];
      if (task.assignedTo.startsWith('user-')) {
        labels.push('user-task');
      } else {
        labels.push('ai-agent-task');
      }

      try {
        const issue = await this.githubCollabService.createIssue(
          username,
          project.repository,
          task.title,
          `${task.description}\n\nEstimated Hours: ${task.estimatedHours}\nAssigned to: ${task.assignedTo}`,
          task.assignedTo.startsWith('user-') ? [user.githubUsername] : [],
          labels,
          milestone.number
        );

        task.githubIssueNumber = issue.number;
      } catch (error) {
        this.logger.error(`Failed to create issue for task: ${task.title}`, error);
      }
    }

    this.websocketGateway.sendProjectCreated({
      projectId: project.id,
      projectName: project.name,
      repository: repo.html_url
    });
  }

  
  private scheduleAgentTask(project: GeneratedProject, task: GeneratedTask) {
    const delay = Math.min(task.estimatedHours * 2000, 60000); // Max 60 seconds
    
    setTimeout(async () => {
      task.status = 'in-progress';
      this.websocketGateway.sendTaskUpdate(task.id, `${task.assignedTo} agent started working on: ${task.title}`);
      
      // Generate actual code for the task
      const generatedFiles = await this.generateTaskCode(project, task);
      task.files = generatedFiles;
      
      setTimeout(async () => {
        task.status = 'review';
        this.websocketGateway.sendTaskUpdate(task.id, `${task.assignedTo} agent completed: ${task.title}`);
        
        // Create PR with actual code for code tasks
        if (task.type === 'feature' && task.assignedTo === 'developer' && generatedFiles.length > 0) {
          await this.createAgentPullRequestWithCode(project, task);
        }
      }, delay);
    }, 5000);
  }

  
   private createBasicTaskFile(project: GeneratedProject, task: GeneratedTask): GeneratedFile {
    const language = this.getLanguageFromTechStack(project.techStack);
    const extension = this.getExtensionForLanguage(language);
    
    let content = '';
    
    if (language === 'javascript') {
      content = `// ${task.title}
// ${task.description}

/**
 * Implementation for: ${task.title}
 * Type: ${task.type}
 * Priority: ${task.priority}
 */

// TODO: Implement ${task.title}
function ${task.title.toLowerCase().replace(/\s+/g, '')}() {
  // Implementation goes here
  console.log('${task.title} - To be implemented');
}

module.exports = {
  ${task.title.toLowerCase().replace(/\s+/g, '')}
};
`;
    } else if (language === 'python') {
      content = `# ${task.title}
# ${task.description}

"""
Implementation for: ${task.title}
Type: ${task.type}
Priority: ${task.priority}
"""

def ${task.title.toLowerCase().replace(/\s+/g, '_')}():
    """
    TODO: Implement ${task.title}
    """
    print("${task.title} - To be implemented")

if __name__ == "__main__":
    ${task.title.toLowerCase().replace(/\s+/g, '_')}()
`;
    } else {
      content = `/*
 * ${task.title}
 * ${task.description}
 * 
 * Type: ${task.type}
 * Priority: ${task.priority}
 * 
 * TODO: Implement this feature
 */
`;
    }

    return {
      path: `src/${task.title.toLowerCase().replace(/\s+/g, '-')}.${extension}`,
      content,
      language
    };
  }

  private sortTasksByDependencies(tasks: GeneratedTask[]): GeneratedTask[] {
    const sorted: GeneratedTask[] = [];
    const visited = new Set<string>();

    const visit = (taskId: string) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);
      
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      task.dependencies.forEach(depId => visit(depId));
      sorted.push(task);
    };

    tasks.forEach(task => visit(task.id));
    return sorted;
  }

  private calculateDeadline(timeline: string): string {
    const deadlines = {
      '1 week (MVP)': 7,
      '2-4 weeks (Basic)': 28,
      '1-2 months (Standard)': 60,
      '3+ months (Complex)': 90
    };
    
    const days = deadlines[timeline] || 30;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    return deadline.toISOString();
  }

  getProject(projectId: string): GeneratedProject | undefined {
    return this.projects.get(projectId);
  }

  getUserProjects(userId: string): GeneratedProject[] {
    return Array.from(this.projects.values()).filter(project =>
      project.tasks.some(task => task.assignedTo === `user-${userId}`)
    );
  }

  updateTaskStatus(projectId: string, taskId: string, status: GeneratedTask['status']) {
    const project = this.projects.get(projectId);
    if (!project) return;

    const task = project.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      this.websocketGateway.sendTaskStatusUpdate({
        projectId,
        taskId,
        status
      });
    }
  }
}