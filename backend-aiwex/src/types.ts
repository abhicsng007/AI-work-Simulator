export interface AgentWork {
  agentId: string;
  taskId: string;
  status: 'planning' | 'coding' | 'testing' | 'reviewing' | 'completed';
  currentActivity: string;
  progress: number;
  files: Array<{ path: string; content: string; status: 'planned' | 'created' | 'modified' }>;
  dependencies: string[];
  blockers: string[];
}