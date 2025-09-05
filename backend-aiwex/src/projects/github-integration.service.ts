import { Injectable } from "@nestjs/common";
import { GithubService } from "src/github/github.service";
import { GithubCollaborationService } from "src/github/github-collaboration.service";
import { ConfigService } from "@nestjs/config";
import { WebsocketGateway } from "src/websocket/websocket.gateway";
import { GeneratedProject , GeneratedTask } from "./project.interface";
import { Logger } from "@nestjs/common";
import { CodeGenerationService } from "./code-generation.service";
import { ProjectUtils } from "./project.utils";

@Injectable()
export class GithubIntegrationService {
  private readonly logger = new Logger(GithubIntegrationService.name);
  constructor(
    private githubService: GithubService,
    private githubCollabService: GithubCollaborationService,
    private configService: ConfigService,
    private websocketGateway: WebsocketGateway,
    private codeGenerationService: CodeGenerationService,
    
  ) {}

  

  public async initializeGitHubProject(project: GeneratedProject, user: any) {
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
        ProjectUtils.calculateDeadline(project.timeline)
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

  public async createAgentPullRequestWithCode(project: GeneratedProject, task: GeneratedTask) {
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
        task.files = await this.codeGenerationService.generateTaskCode(project, task);
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
  
}