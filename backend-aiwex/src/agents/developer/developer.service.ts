import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DeveloperAgent, DeveloperTask } from './developer.agent';
import { OpenAIService } from '../../openai/openai.service';
import { GithubService } from '../../github/github.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';

@Injectable()
export class DeveloperService {
  private agent = new DeveloperAgent();
  private tasks = new Map<string, DeveloperTask>();

  constructor(
    private openAIService: OpenAIService,
    private githubService: GithubService,
    private websocketGateway: WebsocketGateway,
  ) {}

  async createTask(taskData: {
    taskType: DeveloperTask['type'];
    description: string;
    projectName: string;
    language: string;
  }): Promise<DeveloperTask> {
    const task: DeveloperTask = {
      id: uuidv4(),
      type: taskData.taskType,
      description: taskData.description,
      projectName: taskData.projectName,
      language: taskData.language,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.set(task.id, task);
    
    // Execute task asynchronously
    this.executeTask(task.id);
    
    return task;
  }

  async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    try {
      // Update status to in-progress
      this.updateTaskProgress(taskId, 'in-progress', 10);

      // Generate code based on task
      const prompt = this.agent.generateTaskPrompt(task);
      this.websocketGateway.sendTaskUpdate(taskId, 'Generating code with AI...');
      
      const projectStructure = await this.openAIService.generateProjectStructure(task.description);
      this.updateTaskProgress(taskId, 'in-progress', 30);

      // Generate code for each file
      const files: Array<{ path: string; content: string }> = [];
      const fileTemplates = this.agent.generateProjectFiles(task.type, task.language);

      for (const template of fileTemplates) {
        this.websocketGateway.sendTaskUpdate(taskId, `Generating ${template.path}...`);
        
        const filePrompt = `Generate code for ${template.path} in a ${task.projectName} project.
          Description: ${template.description}
          Project context: ${task.description}
          Language: ${task.language}
          
          Return ONLY the code content that should be saved in the file. No explanations, no markdown, just code.`;
        
        const content = await this.openAIService.generateCode(filePrompt, task.language);
        files.push({ path: template.path, content });
        
        this.updateTaskProgress(taskId, 'in-progress', 30 + (files.length / fileTemplates.length) * 40);
      }

      // Create GitHub repository
      this.websocketGateway.sendTaskUpdate(taskId, 'Creating GitHub repository...');
      const repo = await this.githubService.createRepository(
        task.projectName.toLowerCase().replace(/\s+/g, '-'),
        task.description,
      );
      this.updateTaskProgress(taskId, 'in-progress', 80);

      // Push code to repository
      this.websocketGateway.sendTaskUpdate(taskId, 'Pushing code to repository...');
      await this.githubService.pushCode(repo.name, files);
      this.updateTaskProgress(taskId, 'in-progress', 95);

      // Analyze code quality
      const analysis = await this.openAIService.analyzeCode(files[0].content);

      // Complete task
      task.status = 'completed';
      task.progress = 100;
      task.result = {
        repositoryUrl: repo.html_url,
        files,
        analysis,
      };
      task.updatedAt = new Date();

      this.websocketGateway.sendTaskUpdate(taskId, 'Task completed successfully!');
      this.websocketGateway.sendCodeGenerated({
        taskId,
        repositoryUrl: repo.html_url,
        fileCount: files.length,
      });

    } catch (error) {
      console.error('Task execution error:', error);
      task.status = 'failed';
      task.updatedAt = new Date();
      this.websocketGateway.sendTaskUpdate(taskId, `Task failed: ${error.message}`);
    }
  }

  private updateTaskProgress(taskId: string, status: DeveloperTask['status'], progress: number): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      task.progress = progress;
      task.updatedAt = new Date();
      
      this.websocketGateway.sendTaskProgress({
        taskId,
        status,
        progress,
      });
    }
  }

  getTask(taskId: string): DeveloperTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): DeveloperTask[] {
    return Array.from(this.tasks.values());
  }

  async getRepositories() {
    return this.githubService.listUserRepositories();
  }

  getAgentInfo() {
    return {
      id: this.agent.id,
      name: this.agent.name,
      role: this.agent.role,
      personality: this.agent.personality,
      skills: this.agent.skills,
      status: 'online',
      tasksCompleted: Array.from(this.tasks.values()).filter(t => t.status === 'completed').length,
      tasksInProgress: Array.from(this.tasks.values()).filter(t => t.status === 'in-progress').length,
    };
  }
}