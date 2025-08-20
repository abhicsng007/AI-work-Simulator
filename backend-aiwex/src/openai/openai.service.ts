import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateCode(prompt: string, language: string = 'javascript'): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4.1-nano', // Updated to use a valid model
        messages: [
          {
            role: 'system',
            content: `You are an expert ${language} developer. Generate ONLY the code without any markdown formatting, explanations, or comments outside the code. Do not include \`\`\`typescript or \`\`\` markers. Just provide the raw code that should go in the file.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      let code = response.choices[0].message.content || '';
      
      // Clean up any remaining markdown or explanations
      code = this.extractCodeOnly(code);
      
      return code;
    } catch (error) {
      this.logger.error('OpenAI API error:', error);
      throw new Error('Failed to generate code');
    }
  }

  // New method for generating multiple files (needed for project creator)
  async generateMultipleFiles(prompt: string): Promise<{ files: any[] }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4.1-nano',
        messages: [
          {
            role: 'system',
            content: `You are an expert software developer. Generate clean, production-ready code files based on the requirements. 
            Always return valid JSON with an array of file objects.
            Each file object should have: path, content, language.
            Make sure the code is functional and follows best practices.
            Include proper error handling, comments, and structure.
            
            Format: {"files": [{"path": "file/path", "content": "file content", "language": "javascript"}]}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      try {
        const parsed = JSON.parse(content);
        return { files: parsed.files || [] };
      } catch (parseError) {
        this.logger.error('Failed to parse JSON response:', content);
        // Fallback: try to extract files from markdown format
        return this.extractFilesFromMarkdown(content);
      }
    } catch (error) {
      this.logger.error('Error generating multiple files:', error);
      return { files: [] };
    }
  }

  private extractCodeOnly(content: string): string {
    // Remove markdown code blocks
    content = content.replace(/```[a-zA-Z]*\n/g, '');
    content = content.replace(/```/g, '');
    
    // Remove lines that start with ### (markdown headers)
    content = content.split('\n').filter(line => !line.trim().startsWith('###')).join('\n');
    
    // Remove explanation sections (usually after the code)
    // Look for common explanation starters
    const explanationMarkers = [
      '\n\nExplanation:',
      '\n\nUsage:',
      '\n\nNote:',
      '\n\nThis ',
      '\n\n## ',
      '\n\n### ',
    ];
    
    for (const marker of explanationMarkers) {
      const index = content.indexOf(marker);
      if (index > 0) {
        content = content.substring(0, index);
      }
    }
    
    return content.trim();
  }

  private extractFilesFromMarkdown(content: string): { files: any[] } {
    const files: any[] = [];
    const codeBlocks = content.match(/```(\w+)?\n([\s\S]*?)```/g);
    
    if (codeBlocks) {
      codeBlocks.forEach((block, index) => {
        const match = block.match(/```(\w+)?\n([\s\S]*?)```/);
        if (match) {
          const language = match[1] || 'text';
          const code = match[2].trim();
          
          // Try to infer filename from content or use generic name
          let filename = `file${index + 1}`;
          const extension = this.getExtensionForLanguage(language);
          
          // Look for filename hints in comments
          const filenameMatch = code.match(/\/\/\s*(@file|file:)\s*([^\n]+)/i) ||
                              code.match(/\/\*\s*(@file|file:)\s*([^\n]+)\s*\*\//i) ||
                              code.match(/#\s*(@file|file:)\s*([^\n]+)/i);
          
          if (filenameMatch) {
            filename = filenameMatch[2].trim();
          } else {
            filename = `${filename}.${extension}`;
          }

          files.push({
            path: filename,
            content: code,
            language: language
          });
        }
      });
    }

    return { files };
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
      'css': 'css',
      'json': 'json',
      'yaml': 'yml',
      'yml': 'yml',
      'markdown': 'md',
      'sql': 'sql',
      'php': 'php',
      'ruby': 'rb',
      'go': 'go',
      'rust': 'rs',
      'cpp': 'cpp',
      'c': 'c',
      'csharp': 'cs',
      'shell': 'sh',
      'bash': 'sh',
      'dockerfile': 'Dockerfile',
      'xml': 'xml'
    };
    
    return extensions[language.toLowerCase()] || 'txt';
  }

  async analyzeCode(code: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4.1-nano',
        messages: [
          {
            role: 'system',
            content: 'You are a code reviewer. Analyze the provided code for potential improvements, bugs, and best practices.',
          },
          {
            role: 'user',
            content: `Analyze this code:\n\n${code}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      this.logger.error('OpenAI API error:', error);
      throw new Error('Failed to analyze code');
    }
  }

  async generateProjectStructure(projectDescription: string): Promise<any> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4.1-nano',
        messages: [
          {
            role: 'system',
            content: `You are a project planning expert. Generate detailed project structures based on requirements.
            Always return valid JSON with the exact structure requested.
            Focus on creating realistic, achievable tasks with proper dependencies.
            Assign tasks to appropriate roles (developer, designer, qa, manager).
            Include estimated hours based on task complexity.
            
            Return format:
            {
              "name": "Project Name",
              "description": "Project description",
              "repository": "repo-name",
              "features": ["feature1", "feature2"],
              "techStack": ["tech1", "tech2"],
              "tasks": [
                {
                  "title": "Task title",
                  "description": "Task description",
                  "type": "feature|bug|design|test|documentation",
                  "assignedTo": "developer|designer|qa|manager|user-role",
                  "priority": "high|medium|low",
                  "estimatedHours": number,
                  "dependencies": []
                }
              ]
            }`,
          },
          {
            role: 'user',
            content: projectDescription,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      try {
        return JSON.parse(content);
      } catch (parseError) {
        this.logger.error('Failed to parse project structure JSON:', parseError);
        this.logger.error('Raw content:', content);
        
        // Return a fallback structure
        return this.getFallbackProjectStructure();
      }
    } catch (error) {
      this.logger.error('OpenAI API error:', error);
      return this.getFallbackProjectStructure();
    }
  }

  private getFallbackProjectStructure(): any {
    return {
      name: "New Project",
      description: "A generated project",
      repository: "new-project",
      features: ["Basic functionality"],
      techStack: ["JavaScript", "Node.js"],
      tasks: [
        {
          title: "Setup project structure",
          description: "Initialize the basic project structure and configuration",
          type: "feature",
          assignedTo: "developer",
          priority: "high",
          estimatedHours: 2,
          dependencies: []
        },
        {
          title: "Create basic documentation",
          description: "Write README and basic project documentation",
          type: "documentation",
          assignedTo: "developer",
          priority: "medium",
          estimatedHours: 1,
          dependencies: []
        }
      ]
    };
  }

  // New method for generating task-specific code
  async generateTaskSpecificCode(task: any, project: any): Promise<{ files: any[] }> {
    const prompt = `Generate specific code for this development task:

Project Context:
- Name: ${project.name}
- Type: ${project.type}
- Tech Stack: ${project.techStack.join(', ')}
- Features: ${project.features.join(', ')}

Task Details:
- Title: ${task.title}
- Description: ${task.description}
- Type: ${task.type}
- Assigned to: ${task.assignedTo}

Requirements:
1. Generate functional, production-ready code
2. Follow best practices for the chosen tech stack
3. Include proper error handling and validation
4. Add meaningful comments
5. Ensure code is modular and maintainable

Generate appropriate code files that implement this feature.`;

    return this.generateMultipleFiles(prompt);
  }

  // New method for generating test files
  async generateTestFiles(task: any, project: any): Promise<{ files: any[] }> {
    const prompt = `Generate test files for this task:

Project: ${project.name}
Tech Stack: ${project.techStack.join(', ')}
Task: ${task.title}
Description: ${task.description}

Generate comprehensive test files including:
1. Unit tests for individual functions
2. Integration tests where applicable
3. Mock data and fixtures
4. Test setup and teardown

Use appropriate testing frameworks for the tech stack (Jest, Mocha, etc.).`;

    return this.generateMultipleFiles(prompt);
  }

  // New method for generating documentation
  async generateDocumentation(task: any, project: any): Promise<{ files: any[] }> {
    const prompt = `Generate documentation for this task:

Project: ${project.name}
Task: ${task.title}
Description: ${task.description}

Generate appropriate documentation including:
1. API documentation if applicable
2. User guides
3. Technical specifications
4. Installation instructions
5. Usage examples

Return as markdown and other documentation files.`;

    return this.generateMultipleFiles(prompt);
  }

  // Enhanced method for generating initial project files
  async generateInitialProjectFiles(project: any): Promise<{ files: any[] }> {
    const prompt = `Generate initial project structure files for:

Project: ${project.name}
Description: ${project.description}
Type: ${project.type}
Tech Stack: ${project.techStack.join(', ')}
Features: ${project.features.join(', ')}

Generate the essential project files including:
1. README.md with project overview and setup instructions
2. package.json (if Node.js/React project)
3. .gitignore appropriate for the tech stack
4. Basic configuration files
5. Initial source code structure
6. Entry point files (index.js, App.js, etc.)

Make sure files are functional and follow best practices for the chosen technology stack.`;

    return this.generateMultipleFiles(prompt);
  }

  // Method to validate and clean generated code
  async validateAndCleanCode(code: string, language: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4.1-nano',
        messages: [
          {
            role: 'system',
            content: `You are a code validator. Clean up and fix any syntax errors in the provided ${language} code. Return only the corrected code without explanations.`,
          },
          {
            role: 'user',
            content: `Fix any issues in this ${language} code:\n\n${code}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      });

      return response.choices[0].message.content || code;
    } catch (error) {
      this.logger.error('Error validating code:', error);
      return code; // Return original code if validation fails
    }
  }
}