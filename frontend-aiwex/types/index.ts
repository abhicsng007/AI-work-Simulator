export interface Agent {
  id: string;
  name: string;
  role: 'developer' | 'designer' | 'manager' | 'qa' | 'analyst';
  status: 'online' | 'busy' | 'offline';
  avatar: string;
  personality: string;
  skills: string[];
}

export interface Message {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  timestamp: Date;
  channelId: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'general' | 'development' | 'design' | 'testing' | 'management';
  description: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'in-progress' | 'review' | 'completed';
  team: string[];
  deadline: Date;
  progress: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string[];
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  projectId: string;
}