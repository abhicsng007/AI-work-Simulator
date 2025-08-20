export const agents = [
  {
    id: 'agent-1',
    name: 'Alex Dev',
    role: 'developer',
    status: 'online' as const,
    avatar: '👨‍💻',
    personality: 'Methodical and detail-oriented. Loves clean code and documentation.',
    skills: ['React', 'TypeScript', 'Node.js', 'Testing']
  },
  {
    id: 'agent-2',
    name: 'Sarah Design',
    role: 'designer',
    status: 'online' as const,
    avatar: '👩‍🎨',
    personality: 'Creative and user-focused. Always thinking about the user experience.',
    skills: ['UI/UX', 'Figma', 'Design Systems', 'Prototyping']
  },
  {
    id: 'agent-3',
    name: 'Mike Manager',
    role: 'manager',
    status: 'busy' as const,
    avatar: '👨‍💼',
    personality: 'Strategic thinker. Focuses on team coordination and project delivery.',
    skills: ['Project Management', 'Agile', 'Team Leadership', 'Communication']
  },
  {
    id: 'agent-4',
    name: 'Emma QA',
    role: 'qa',
    status: 'online' as const,
    avatar: '👩‍🔬',
    personality: 'Meticulous and thorough. Finds bugs others miss.',
    skills: ['Test Automation', 'Manual Testing', 'Bug Tracking', 'Performance Testing']
  },
  {
    id: 'agent-5',
    name: 'David Analytics',
    role: 'analyst',
    status: 'offline' as const,
    avatar: '👨‍📊',
    personality: 'Data-driven decision maker. Loves metrics and insights.',
    skills: ['Data Analysis', 'SQL', 'Reporting', 'Business Intelligence']
  }
];

export const channels = [
  {
    id: 'general',
    name: 'general',
    type: 'general' as const,
    description: 'General discussion and team updates'
  },
  {
    id: 'development',
    name: 'development',
    type: 'development' as const,
    description: 'Code discussions and technical topics'
  },
  {
    id: 'design',
    name: 'design',
    type: 'design' as const,
    description: 'Design reviews and creative discussions'
  },
  {
    id: 'testing',
    name: 'testing',
    type: 'testing' as const,
    description: 'QA reports and testing strategies'
  },
  {
    id: 'management',
    name: 'management',
    type: 'management' as const,
    description: 'Project planning and team coordination'
  }
];

export const projects = [
  {
    id: 'proj-1',
    name: 'E-commerce Platform',
    description: 'Building a modern e-commerce platform with AI recommendations',
    status: 'in-progress' as const,
    team: ['agent-1', 'agent-2', 'agent-4'],
    deadline: new Date('2024-06-30'),
    progress: 65
  },
  {
    id: 'proj-2',
    name: 'Mobile App Redesign',
    description: 'Complete UI/UX overhaul of our mobile application',
    status: 'planning' as const,
    team: ['agent-2', 'agent-3'],
    deadline: new Date('2024-07-15'),
    progress: 15
  }
];

export const tasks = [
  {
    id: 'task-1',
    title: 'Implement user authentication',
    description: 'Add JWT-based authentication to the API',
    assignedTo: ['agent-1'],
    status: 'in-progress' as const,
    priority: 'high' as const,
    projectId: 'proj-1',
    type: 'feature' as const
  },
  {
    id: 'task-2',
    title: 'Design product listing page',
    description: 'Create responsive design for product listings',
    assignedTo: ['agent-2'],
    status: 'review' as const,
    priority: 'medium' as const,
    projectId: 'proj-1',
    type: 'design' as const
  },
  {
    id: 'task-3',
    title: 'Write test cases for checkout flow',
    description: 'Comprehensive test coverage for the checkout process',
    assignedTo: ['agent-4'],
    status: 'todo' as const,
    priority: 'high' as const,
    projectId: 'proj-1',
    type: 'test' as const
  }
];

export const initialMessages = [
  {
    id: 'msg-1',
    content: 'Good morning team! Ready to tackle the e-commerce project today.',
    authorId: 'agent-3',
    authorName: 'Mike Manager',
    authorRole: 'manager',
    timestamp: new Date(Date.now() - 3600000),
    channelId: 'general'
  },
  {
    id: 'msg-2',
    content: "Morning! I'll be working on the authentication system today.",
    authorId: 'agent-1',
    authorName: 'Alex Dev',
    authorRole: 'developer',
    timestamp: new Date(Date.now() - 3000000),
    channelId: 'general'
  },
  {
    id: 'msg-3',
    content: 'The new design mockups are ready for review. Please check them out!',
    authorId: 'agent-2',
    authorName: 'Sarah Design',
    authorRole: 'designer',
    timestamp: new Date(Date.now() - 2400000),
    channelId: 'design'
  },
  {
    id: 'msg-4',
    content: 'Found a few edge cases in the checkout flow. Creating tickets now.',
    authorId: 'agent-4',
    authorName: 'Emma QA',
    authorRole: 'qa',
    timestamp: new Date(Date.now() - 1800000),
    channelId: 'testing'
  },
  {
    id: 'msg-5',
    content: "Let's sync up at 2 PM to discuss the sprint progress.",
    authorId: 'agent-3',
    authorName: 'Mike Manager',
    authorRole: 'manager',
    timestamp: new Date(Date.now() - 1200000),
    channelId: 'general'
  },
  {
    id: 'msg-6',
    content: 'PR #42 is ready for review. Added comprehensive tests as requested.',
    authorId: 'agent-1',
    authorName: 'Alex Dev',
    authorRole: 'developer',
    timestamp: new Date(Date.now() - 600000),
    channelId: 'development'
  }
];