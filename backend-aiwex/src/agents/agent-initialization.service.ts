import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Agent, AgentDocument } from '../database/schemas/agent.schema';
import { Channel, ChannelDocument } from '../database/schemas/channel.schema';
import { Model } from 'mongoose';
import { RealAgentCommunicationService } from "./communication/real-agent-communication.service";
import { AgentWork } from "./agent-work.interface";
import { OpenAIService } from "src/openai/openai.service";

@Injectable()
export class AgentInitializationService {
  private readonly logger = new Logger(AgentInitializationService.name);
  private activeWork = new Map<string, AgentWork>();
  private projectContext = new Map<string, any>();

  constructor(
    @InjectModel(Agent.name) private agentModel: Model<AgentDocument>,
    @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>,
    public realCommunicationService: RealAgentCommunicationService,
    public openAIService: OpenAIService,
  ) {}

  async getAllAgentsFromDB(): Promise<any[]> {
  try {
    const agents = await this.agentModel.find({}).lean().exec(); // Use .lean() for plain objects
    return agents || [];
  } catch (error) {
    this.logger.error('Error fetching agents from DB:', error);
    return [];
  }
}


  async getAllChannelsFromDB(): Promise<any[]> {
  try {
    const channels = await this.channelModel.find({}).lean().exec(); // Use .lean() for plain objects
    return channels || [];
  } catch (error) {
    this.logger.error('Error fetching channels from DB:', error);
    return [];
  }
}


  async initializeAgentsAndChannels(): Promise<void> {
  this.logger.log('🔧 Initializing default agents and channels...');
  
  try {
    // Create default channels (this part looks correct)
    const defaultChannels = [
      { channelId: 'general', name: 'General', description: 'General discussion and announcements' },
      { channelId: 'development', name: 'Development', description: 'Development discussions and code reviews' },
      { channelId: 'design', name: 'Design', description: 'Design discussions and UI/UX feedback' },
      { channelId: 'testing', name: 'Testing', description: 'QA discussions and test results' },
      { channelId: 'management', name: 'Management', description: 'Project management and planning' }
    ];

    for (const channelData of defaultChannels) {
      try {
        const existingChannel = await this.channelModel.findOne({ channelId: channelData.channelId }).exec();
        if (!existingChannel) {
          const channel = new this.channelModel({
            ...channelData,
            type: 'text',
            isDefault: channelData.channelId === 'general'
          });
          await channel.save();
          this.logger.log(`📢 Created channel: ${channelData.name}`);
        } else {
          this.logger.log(`✅ Channel exists: ${channelData.name}`);
        }
      } catch (channelError) {
        this.logger.error(`Error creating channel ${channelData.name}:`, channelError);
      }
    }
    // Create default agents
    const defaultAgents = [
      {
        agentId: 'developer',
        name: 'Alex Developer',
        role: 'developer',
        avatar: 'https://ui-avatars.com/api/?name=Alex+Dev&background=4F46E5&color=fff',
        status: 'online',
        skills: ['JavaScript', 'React', 'Node.js', 'Git', 'MongoDB'],
        personality: 'Professional and detail-oriented developer who enjoys solving complex problems',
        configuration: {
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 1000,
          systemPrompt: 'You are Alex, a skilled full-stack developer specializing in modern web technologies.'
        },
        lastActiveAt: new Date()
      },
      {
        agentId: 'designer',
        name: 'Sarah Designer',
        role: 'designer',
        avatar: 'https://ui-avatars.com/api/?name=Sarah+Design&background=EC4899&color=fff',
        status: 'online',
        skills: ['UI/UX', 'Figma', 'Adobe Creative Suite', 'Prototyping'],
        personality: 'Creative and empathetic designer who prioritizes user experience',
        configuration: {
          model: 'gpt-4',
          temperature: 0.8,
          maxTokens: 1000,
          systemPrompt: 'You are Sarah, a creative UI/UX designer focused on user-centered design.'
        },
        lastActiveAt: new Date()
      },
      {
        agentId: 'qa',
        name: 'Emma QA',
        role: 'qa',
        avatar: 'https://ui-avatars.com/api/?name=Emma+QA&background=10B981&color=fff',
        status: 'online',
        skills: ['Testing', 'Automation', 'Bug Tracking', 'Quality Assurance'],
        personality: 'Meticulous and thorough QA engineer with an eye for detail',
        configuration: {
          model: 'gpt-4',
          temperature: 0.5,
          maxTokens: 1000,
          systemPrompt: 'You are Emma, a quality assurance engineer ensuring product reliability.'
        },
        lastActiveAt: new Date()
      },
      {
        agentId: 'manager',
        name: 'Mike Manager',
        role: 'manager',
        avatar: 'https://ui-avatars.com/api/?name=Mike+Manager&background=F59E0B&color=fff',
        status: 'online',
        skills: ['Project Management', 'Planning', 'Coordination', 'Leadership'],
        personality: 'Organized and diplomatic leader who keeps teams focused and motivated',
        configuration: {
          model: 'gpt-4',
          temperature: 0.6,
          maxTokens: 1000,
          systemPrompt: 'You are Mike, a project manager coordinating team efforts and ensuring project success.'
        },
        lastActiveAt: new Date()
      },
      {
        agentId: 'analyst',
        name: 'David Analyst',
        role: 'analyst',
        avatar: 'https://ui-avatars.com/api/?name=David+Analyst&background=8B5CF6&color=fff',
        status: 'online',
        skills: ['Data Analysis', 'Requirements', 'Documentation', 'Research'],
        personality: 'Analytical and systematic thinker who excels at breaking down complex requirements',
        configuration: {
          model: 'gpt-4',
          temperature: 0.4,
          maxTokens: 1000,
          systemPrompt: 'You are David, a business analyst focusing on requirements and documentation.'
        },
        lastActiveAt: new Date()
      }
    ];

    for (const agentData of defaultAgents) {
      try {
        const existingAgent = await this.agentModel.findOne({ agentId: agentData.agentId }).exec();
        if (!existingAgent) {
          const agent = new this.agentModel(agentData);
          await agent.save();
          this.logger.log(`👤 Created agent: ${agentData.name}`);
        } else {
          this.logger.log(`✅ Agent exists: ${agentData.name}`);
        }
      } catch (agentError) {
        this.logger.error(`Error creating agent ${agentData.name}:`, agentError);
      }
    }

    this.logger.log('✅ Initialization complete');
  } catch (error) {
    this.logger.error('❌ Error during initialization:', error);
    throw error;
  }
}
async verifyAgentsInDatabase(tasksByAgent: Record<string, any[]>): Promise<void> {
  this.logger.log('🔍 Verifying agents are actually in database...');
  
  for (const agentId of Object.keys(tasksByAgent)) {
    try {
      const agent = await this.agentModel.findOne({ agentId }).exec();
      if (agent) {
        const agentData = agent.toObject ? agent.toObject() : agent;
        this.logger.log(`✅ Database verification: Agent ${agentId} found - ${agentData.name}`);
      } else {
        this.logger.error(`❌ Database verification: Agent ${agentId} NOT found in database!`);
        
        // Force create the agent if it's still missing
        this.logger.log(`🔧 Force creating missing agent: ${agentId}`);
        await this.forceCreateAgent(agentId);
      }
    } catch (error) {
      this.logger.error(`Error verifying agent ${agentId} in database:`, error);
    }
  }
}

async sendProjectKickoffMessage(tasksByAgent: Record<string, any[]>): Promise<void> {
    try {
      await this.sendAgentMessage(
        'manager',
        'general',
        `🚀 **Project Kickoff!** Starting work on the new project. I've assigned tasks to the team:\n\n` +
        `${this.formatTaskAssignments(tasksByAgent)}\n\n` +
        `Let's collaborate and keep each other updated on progress! 💪`
      );
    } catch (error) {
      this.logger.error('Error sending kickoff message:', error);
    }
  }

  formatTaskAssignments(tasksByAgent: Record<string, any[]>): string {
    const assignments: string[] = [];
    
    for (const [agentId, tasks] of Object.entries(tasksByAgent)) {
      const agentName = this.getDefaultAgentName(agentId);
      assignments.push(`**${agentName}**: ${tasks.length} task${tasks.length > 1 ? 's' : ''}`);
    }

    return assignments.join('\n');
  }


  async sendAgentMessage(agentId: string, channelId: string, content: string) {
  // Use real AI communication instead of hardcoded messages
  await this.realCommunicationService.sendAIMessage(
    agentId,
    channelId,
    'general_update',
    {
      conversationTopic: 'work_update',
      currentTask: this.getCurrentTaskForAgent(agentId)
    }
  );
}

getCurrentTaskForAgent(agentId: string): any {
  // Look through active work to find current task for this agent
  for (const [workKey, work] of this.activeWork.entries()) {
    if (work.agentId === agentId) {
      return {
        title: work.taskId,
        status: work.status,
        progress: work.progress
      };
    }
  }
  return null;
}



  // Move all agent creation and verification methods here
  async verifyAgentsExist(tasksByAgent: Record<string, any[]>): Promise<void> {
  for (const agentId of Object.keys(tasksByAgent)) {
    try {
      const agent = await this.agentModel.findOne({ agentId }).exec();
      if (!agent) {
        this.logger.warn(`⚠️ Agent ${agentId} not found in database, creating default agent`);
        
        const defaultAgent = new this.agentModel({
          agentId,
          name: this.getDefaultAgentName(agentId),
          role: agentId,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(agentId)}&background=random&color=fff`,
          status: 'active',
          skills: this.getDefaultSkills(agentId),
          isOnline: true,
          bio: `AI ${agentId} agent`
        });
        
        await defaultAgent.save();
        this.logger.log(`✅ Created default agent: ${agentId}`);
      } else {
        // Use .lean() or cast to any to access custom properties
        const agentData = agent.toObject ? agent.toObject() : agent;
        this.logger.log(`✅ Agent verified: ${agentData.name} (${agentData.role})`);
      }
    } catch (error) {
      this.logger.error(`Error verifying agent ${agentId}:`, error);
    }
  }
}

  async forceCreateAgent(agentId: string): Promise<void> {
  try {
    const agentData = {
      agentId,
      name: this.getDefaultAgentName(agentId),
      role: this.mapToValidRole(agentId),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(agentId)}&background=random&color=fff`,
      status: 'online',
      skills: this.getDefaultSkills(agentId),
      personality: this.getDefaultPersonality(agentId),
      configuration: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        systemPrompt: `You are ${this.getDefaultAgentName(agentId)}, an AI ${this.mapToValidRole(agentId)} agent.`
      },
      lastActiveAt: new Date()
    };

    const agent = new this.agentModel(agentData);
    await agent.save();
    
    this.logger.log(`✅ Force created agent: ${agentData.name}`);
    
    // Double-check it was created
    const verifyAgent = await this.agentModel.findOne({ agentId }).exec();
    if (verifyAgent) {
      this.logger.log(`✅ Verified force-created agent exists: ${agentId}`);
    } else {
      this.logger.error(`❌ Force-created agent still not found: ${agentId}`);
    }
  } catch (error) {
    this.logger.error(`Error force creating agent ${agentId}:`, error);
  }
}

   mapToValidRole(agentId: string): string {
  // Map any invalid role to a valid one from the enum
  const validRoles = ['developer', 'designer', 'qa', 'manager', 'analyst'];
  
  // Handle specific mappings
  if (agentId.includes('developer') || agentId.includes('dev')) {
    return 'developer';
  }
  if (agentId.includes('design')) {
    return 'designer';
  }
  if (agentId.includes('qa') || agentId.includes('test')) {
    return 'qa';
  }
  if (agentId.includes('manager') || agentId.includes('lead')) {
    return 'manager';
  }
  if (agentId.includes('analyst') || agentId.includes('business')) {
    return 'analyst';
  }
  
  // If agentId is already a valid role, use it
  if (validRoles.includes(agentId)) {
    return agentId;
  }
  
  // Default fallback
  return 'developer';
}

  getDefaultAgentName(agentId: string): string {
  const nameMap = {
    'developer': 'Alex Developer',
    'designer': 'Sarah Designer', 
    'qa': 'Emma QA',
    'manager': 'Mike Manager',
    'analyst': 'David Analyst',
    'junior-developer': 'Junior Developer', // Handle specific case
    'senior-developer': 'Senior Developer'
  };
  
  return nameMap[agentId] || `${agentId.charAt(0).toUpperCase() + agentId.slice(1).replace('-', ' ')} Agent`;
}
  
  getDefaultSkills(agentId: string): string[] {
  const skillsMap = {
    'developer': ['JavaScript', 'React', 'Node.js', 'Git'],
    'designer': ['UI/UX', 'Figma', 'Adobe Creative Suite'],
    'qa': ['Testing', 'Automation', 'Bug Tracking'],
    'manager': ['Project Management', 'Planning', 'Coordination'],
    'analyst': ['Data Analysis', 'Requirements', 'Documentation']
  };
  
  // Handle specific cases
  if (agentId.includes('developer') || agentId.includes('dev')) {
    return skillsMap['developer'];
  }
  if (agentId.includes('design')) {
    return skillsMap['designer'];
  }
  if (agentId.includes('qa') || agentId.includes('test')) {
    return skillsMap['qa'];
  }
  if (agentId.includes('manager') || agentId.includes('lead')) {
    return skillsMap['manager'];
  }
  if (agentId.includes('analyst') || agentId.includes('business')) {
    return skillsMap['analyst'];
  }
  
  return skillsMap[agentId] || ['General', 'Problem Solving'];
}

getDefaultPersonality(agentId: string): string {
  const personalityMap = {
    'developer': 'Logical and systematic problem-solver who enjoys coding challenges',
    'designer': 'Creative and user-focused with strong aesthetic sensibilities',
    'qa': 'Detail-oriented and methodical with a passion for quality',
    'manager': 'Organized leader with excellent communication and planning skills',
    'analyst': 'Analytical thinker who excels at requirements gathering and documentation'
  };
  
  // Handle specific cases
  if (agentId.includes('developer') || agentId.includes('dev')) {
    return personalityMap['developer'];
  }
  if (agentId.includes('design')) {
    return personalityMap['designer'];
  }
  if (agentId.includes('qa') || agentId.includes('test')) {
    return personalityMap['qa'];
  }
  if (agentId.includes('manager') || agentId.includes('lead')) {
    return personalityMap['manager'];
  }
  if (agentId.includes('analyst') || agentId.includes('business')) {
    return personalityMap['analyst'];
  }
  
  return personalityMap[agentId] || 'Helpful and collaborative team member';
}

async startPlanningPhase(projectId: string, tasksByAgent: Record<string, any[]>) {
    try {
      const managerAgent = await this.agentModel.findOne({ agentId: 'manager' });
      if (managerAgent) {
        await this.sendAgentMessage(
          'manager',
          'management',
          `📋 **Planning Phase Started**\n\nTeam, let's discuss our approach and identify any dependencies.`
        );

        // Each agent discusses their tasks
        for (const [agentId, tasks] of Object.entries(tasksByAgent)) {
          if (tasks.length > 0) {
            const agent = await this.agentModel.findOne({ agentId });
            if (agent) {
              try {
                const planMessage = await this.generateAgentPlan(agent, tasks, projectId);
                await this.sendAgentMessage(agentId, 'development', planMessage);
              } catch (error) {
                this.logger.error(`Error generating plan for ${agentId}:`, error);
              }
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in planning phase:', error);
    }
  }

   async generateAgentPlan(agent: AgentDocument, tasks: any[], projectId: string): Promise<string> {
      try {
        const context = this.projectContext.get(projectId);
        const taskDescriptions = tasks.map(t => `- ${t.title}: ${t.description}`).join('\n');
  
        const prompt = `As ${agent.name} (${agent.role}), create a brief plan for these tasks:
  ${taskDescriptions}
  
  Consider:
  1. Dependencies on other team members
  2. Potential challenges
  3. Estimated approach
  4. Any questions or clarifications needed
  
  Keep it conversational and brief (2-3 sentences per task).`;
  
        const plan = await this.openAIService.generateCode(prompt, 'text');
        return `**${agent.name}'s Plan:**\n\n${plan}`;
      } catch (error) {
        this.logger.error('Error generating agent plan:', error);
        return `**${agent.name}'s Plan:**\n\nI'm ready to work on ${tasks.length} task(s). Let me get started!`;
      }
    }
  
groupTasksByAgent(tasks: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    for (const task of tasks) {
      const agentId = task.assignedTo.startsWith('user-') ? null : task.assignedTo;
      if (agentId) {
        if (!grouped[agentId]) grouped[agentId] = [];
        grouped[agentId].push(task);
      }
    }

    return grouped;
  }

}