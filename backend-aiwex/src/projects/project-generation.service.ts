import { OpenAIService } from "src/openai/openai.service";
import { CodeGenerationService } from "./code-generation.service";
import { GithubService } from "src/github/github.service";
import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { GeneratedProject } from "./project.interface";
import { ProjectUtils } from "./project.utils";


@Injectable()
export class ProjectGenerationService {
  private readonly logger = new Logger(ProjectGenerationService.name);

  constructor(
    private openAIService: OpenAIService,
    private codeGenerationService: CodeGenerationService,
    private githubService: GithubService,
    private configService: ConfigService
  ) {}

  public async generateProjectPlan(projectData: any, user: any) {
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
    }`;

    const response = await this.openAIService.generateProjectStructure(prompt);
    return {
      ...response,
      tasks: response.tasks || []
    };
  }

  async generateInitialProjectFiles(project: GeneratedProject): Promise<void> {
    this.logger.log(`Generating AI-driven project structure for: ${project.name}`);
    
    try {
      const username = this.configService.get<string>('GITHUB_USERNAME');
      if (!username) {
        throw new Error('GitHub username not configured');
      }

      // Let AI generate the complete project structure
      const projectFiles = await this.codeGenerationService.generateAIProjectStructure(project);
      
      if (projectFiles.length === 0) {
        this.logger.warn('AI generated no files, falling back to basic structure');
        projectFiles.push(...this.generateMinimalFallback(project));
      }

      // Create files in batches to avoid API limits
      const batches = ProjectUtils.chunkArray(projectFiles, 5);
      
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
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.logger.log(`Successfully created ${projectFiles.length} AI-generated files`);
    } catch (error) {
      this.logger.error('Error generating initial project files:', error);
    }
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

}