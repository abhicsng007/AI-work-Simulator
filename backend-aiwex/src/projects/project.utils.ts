import { GeneratedTask } from "./project.interface";


export class ProjectUtils {
  static sortTasksByDependencies(tasks: GeneratedTask[]): GeneratedTask[] {
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

  static calculateDeadline(timeline: string): string {
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

  static inferLanguageFromPath(path: string): string {
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

  static chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
  static getLanguageFromTechStack(techStack: string[]): string {
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


  static getExtensionForLanguage(language: string): string {
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
  static getTaskCountForRole(role: string): string {
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

}