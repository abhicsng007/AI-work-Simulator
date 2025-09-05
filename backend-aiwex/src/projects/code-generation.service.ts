import { Injectable } from "@nestjs/common";
import { OpenAIService } from "src/openai/openai.service";
import { GeneratedTask, GeneratedProject, GeneratedFile } from "./project.interface";
import { Logger } from "@nestjs/common";
import { ProjectUtils } from "./project.utils";
import { ContentGenerators } from "./content-generators";

@Injectable()
export class CodeGenerationService {
  private readonly logger = new Logger(CodeGenerationService.name);
  constructor(
    private openAIService: OpenAIService

  ) {}

  public async generateTaskCode(project: GeneratedProject, task: GeneratedTask): Promise<GeneratedFile[]> {
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
          language: ProjectUtils.inferLanguageFromPath(file.path || '')
        }));
      } else if (Array.isArray(response)) {
        files = response.map(file => ({
          path: file.path || `src/${task.title.toLowerCase().replace(/\s+/g, '-')}.js`,
          content: file.content || '',
          language: ProjectUtils.inferLanguageFromPath(file.path || '')
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
            language: ProjectUtils.inferLanguageFromPath(file.path || '')
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
  
  
  
  public async generateAIProjectStructure(project: GeneratedProject): Promise<Array<{path: string, content: string}>> {
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

  public async generateFallbackTaskFiles(project: GeneratedProject, task: GeneratedTask): Promise<GeneratedFile[]> {
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
          language: ProjectUtils.inferLanguageFromPath(file.path || '')
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

  public async generateTechStackFiles(project: GeneratedProject): Promise<GeneratedFile[]> {
      const files: GeneratedFile[] = [];
  
      // Generate basic app structure
      if (project.techStack.some(tech => tech.toLowerCase().includes('react'))) {
        files.push({
          path: 'src/App.js',
          content: ContentGenerators.generateReactAppContent(project),
          language: 'javascript'
        });
  
        files.push({
          path: 'public/index.html',
          content: ContentGenerators.generateIndexHtmlContent(project),
          language: 'html'
        });
      }
  
      if (project.techStack.some(tech => tech.toLowerCase().includes('express') || tech.toLowerCase().includes('node'))) {
        files.push({
          path: 'index.js',
          content: ContentGenerators.generateExpressServerContent(project),
          language: 'javascript'
        });
      }
  
      return files;
    }
  

  public async generateProjectStructure(project: GeneratedProject): Promise<GeneratedFile[]> {
      const files: GeneratedFile[] = [];
      
      // Generate README.md
      files.push({
        path: 'README.md',
        content: ContentGenerators.generateReadmeContent(project),
        language: 'markdown'
      });
  
      // Generate .gitignore
      files.push({
        path: '.gitignore',
        content: ContentGenerators.generateGitignoreContent(project.techStack),
        language: 'text'
      });
  
      // Generate package.json for Node.js projects
      if (project.techStack.some(tech => tech.toLowerCase().includes('node') || tech.toLowerCase().includes('react'))) {
        files.push({
          path: 'package.json',
          content: ContentGenerators.generatePackageJsonContent(project),
          language: 'json'
        });
      }
  
      // Generate basic project structure files based on tech stack
      const structureFiles = await this.generateTechStackFiles(project);
      files.push(...structureFiles);
  
      return files;
    }

  public createBasicTaskFile(project: GeneratedProject, task: GeneratedTask): GeneratedFile {
      const language = ProjectUtils.getLanguageFromTechStack(project.techStack);
      const extension = ProjectUtils.getExtensionForLanguage(language);
      
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

  public async createBasicProjectStructure(project: GeneratedProject): Promise<Array<{path: string, content: string}>> {
      const files: Array<{path: string, content: string}> = [];
      
      // Generate README.md
      files.push({
        path: 'README.md',
        content: ContentGenerators.generateReadmeContent(project)
      });
  
      // Generate .gitignore
      files.push({
        path: '.gitignore',
        content: ContentGenerators.generateGitignoreContent(project.techStack)
      });
  
      // Generate package.json for Node.js projects
      if (project.techStack.some(tech => tech.toLowerCase().includes('node') || tech.toLowerCase().includes('react'))) {
        files.push({
          path: 'package.json',
          content: ContentGenerators.generatePackageJsonContent(project)
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
}