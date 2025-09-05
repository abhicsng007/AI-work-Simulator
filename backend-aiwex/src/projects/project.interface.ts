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
