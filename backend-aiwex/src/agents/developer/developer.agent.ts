export interface DeveloperTask {
  id: string;
  type: 'create-api' | 'create-frontend' | 'fix-bug' | 'add-feature' | 'refactor';
  description: string;
  projectName: string;
  language: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress: number;
  result?: {
    repositoryUrl?: string;
    files?: Array<{ path: string; content: string }>;
    analysis?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class DeveloperAgent {
  id = 'agent-developer-1';
  name = 'Alex Dev';
  role = 'developer';
  personality = 'Methodical and detail-oriented. Loves clean code and documentation.';
  skills = ['TypeScript', 'JavaScript', 'React', 'Node.js', 'NestJS', 'Testing', 'Git'];
  
  generateTaskPrompt(task: DeveloperTask): string {
    const prompts = {
      'create-api': `Create a REST API with the following requirements:
        - Project: ${task.projectName}
        - Description: ${task.description}
        - Language: ${task.language}
        - Include proper error handling, validation, and documentation
        - Follow RESTful best practices
        - Include a README with setup instructions`,
      
      'create-frontend': `Create a frontend application with:
        - Project: ${task.projectName}
        - Description: ${task.description}
        - Language/Framework: ${task.language}
        - Include responsive design
        - Follow component-based architecture
        - Include proper state management`,
      
      'fix-bug': `Fix the following bug:
        - Project: ${task.projectName}
        - Issue: ${task.description}
        - Provide a detailed explanation of the fix
        - Include tests to prevent regression`,
      
      'add-feature': `Add the following feature:
        - Project: ${task.projectName}
        - Feature: ${task.description}
        - Language: ${task.language}
        - Ensure backward compatibility
        - Include tests and documentation`,
      
      'refactor': `Refactor the code with:
        - Project: ${task.projectName}
        - Goal: ${task.description}
        - Improve code quality and maintainability
        - Ensure all tests pass after refactoring`,
    };

    return prompts[task.type] || prompts['create-api'];
  }

  generateProjectFiles(projectType: string, language: string): Array<{ path: string; description: string }> {
    const templates = {
      'typescript-api': [
        { path: 'src/index.ts', description: 'Main application entry point' },
        { path: 'src/routes/index.ts', description: 'API routes' },
        { path: 'src/controllers/index.ts', description: 'Route controllers' },
        { path: 'src/services/index.ts', description: 'Business logic services' },
        { path: 'src/middleware/error.ts', description: 'Error handling middleware' },
        { path: 'src/types/index.ts', description: 'TypeScript type definitions' },
        { path: 'package.json', description: 'Project dependencies' },
        { path: 'tsconfig.json', description: 'TypeScript configuration' },
        { path: 'README.md', description: 'Project documentation' },
        { path: '.gitignore', description: 'Git ignore file' },
        { path: '.env.example', description: 'Environment variables example' },
      ],
      'react-app': [
        { path: 'src/App.tsx', description: 'Main React component' },
        { path: 'src/index.tsx', description: 'Application entry point' },
        { path: 'src/components/index.ts', description: 'React components' },
        { path: 'src/hooks/index.ts', description: 'Custom React hooks' },
        { path: 'src/services/api.ts', description: 'API service layer' },
        { path: 'src/types/index.ts', description: 'TypeScript types' },
        { path: 'src/styles/globals.css', description: 'Global styles' },
        { path: 'package.json', description: 'Project dependencies' },
        { path: 'tsconfig.json', description: 'TypeScript configuration' },
        { path: 'README.md', description: 'Project documentation' },
        { path: '.gitignore', description: 'Git ignore file' },
      ],
    };

    const key = language === 'typescript' && projectType.includes('api') 
      ? 'typescript-api' 
      : 'react-app';
    
    return templates[key] || templates['typescript-api'];
  }
}