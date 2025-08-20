import { Controller, Get, Post, Body, Param, Delete, Logger ,Headers } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { DeveloperService } from './developer/developer.service';
import { AgentWorkService, AgentWork } from './agent-work.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UsersService } from '../users/users.service';

@Controller('agents')
export class AgentsController {
  private readonly logger = new Logger(AgentsController.name); // Add logger

  constructor(
  private agentsService: AgentsService,
  private developerService: DeveloperService,
  private agentWorkService: AgentWorkService,
  private usersService: UsersService, // ADD THIS
) {}


  @Get()
  getAllAgents() {
    return this.agentsService.getAllAgents();
  }

  @Get('work-status')
  async getAgentWorkStatus(): Promise<Array<{
    agent: { name: string; role: string; avatar: string };
    task: { title: string; type: string };
    work: AgentWork;
  }>> {
    return this.agentWorkService.getAgentWorkStatus();
  }

  // ========== DEBUG ENDPOINTS WITH FIXED TYPING ==========
  
  @Get('debug/work-queue-status')
  getWorkQueueStatus() {
    try {
      return this.agentWorkService.getWorkQueueStatus();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { error: errorMessage };
    }
  }

  @Get('debug/project-contexts')
  getProjectContexts() {
    try {
      // This will show what project contexts are stored in AgentWorkService
      const status = this.agentWorkService.getWorkQueueStatus();
      return {
        projectContexts: status.projectContexts,
        hasProjectCreatorService: status.hasProjectCreatorService,
        activeWork: status.activeWork,
        queueLength: status.queueLength,
        isProcessing: status.isProcessing
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { error: errorMessage };
    }
  }

  @Post('debug/initialize-defaults')
  async initializeDefaults() {
    try {
      // Call the initialization method from AgentWorkService
      await this.agentWorkService.initializeAgentsAndChannels();
      return { 
        success: true, 
        message: 'Default agents and channels have been created/verified' 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { 
        success: false, 
        error: errorMessage,
        details: 'Failed to initialize default agents and channels'
      };
    }
  }

  @Get('debug/agents-in-db')
  async getAgentsInDatabase() {
    try {
      // Get agents with proper typing
      const agents = await this.agentWorkService.getAllAgentsFromDB();
      return {
        count: agents.length,
        agents: agents.map((agent: any) => ({
          agentId: agent.agentId || 'Unknown',
          name: agent.name || 'Unknown',
          role: agent.role || 'Unknown',
          status: agent.status || 'Unknown',
          isOnline: agent.isOnline !== undefined ? agent.isOnline : false,
          avatar: agent.avatar || null,
          skills: agent.skills || [],
          bio: agent.bio || null
        }))
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { error: errorMessage };
    }
  }

  @Get('debug/channels-in-db')
  async getChannelsInDatabase() {
    try {
      // Get channels with proper typing
      const channels = await this.agentWorkService.getAllChannelsFromDB();
      return {
        count: channels.length,
        channels: channels.map((channel: any) => ({
          channelId: channel.channelId || 'Unknown',
          name: channel.name || 'Unknown',
          description: channel.description || null,
          type: channel.type || 'text',
          isDefault: channel.isDefault !== undefined ? channel.isDefault : false
        }))
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { error: errorMessage };
    }
  }

  @Post('debug/test-project-context/:projectId')
  testProjectContext(@Param('projectId') projectId: string) {
    try {
      // Test if AgentWorkService can access ProjectCreatorService
      return this.agentWorkService.testProjectCreatorAccess(projectId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { error: errorMessage };
    }
  }

  @Get('debug/agent-work-detailed')
  async getAgentWorkDetailed() {
    try {
      const workStatus = this.agentWorkService.getWorkQueueStatus();
      const agents = await this.agentWorkService.getAllAgentsFromDB();
      const channels = await this.agentWorkService.getAllChannelsFromDB();
      
      return {
        success: true,
        workQueue: {
          length: workStatus.queueLength,
          isProcessing: workStatus.isProcessing,
          items: workStatus.workQueueItems || []
        },
        agents: {
          total: agents.length,
          list: agents.map((agent: any) => ({
            agentId: agent.agentId,
            name: agent.name,
            role: agent.role,
            isOnline: agent.isOnline || false
          }))
        },
        channels: {
          total: channels.length,
          list: channels.map((channel: any) => ({
            channelId: channel.channelId,
            name: channel.name,
            isDefault: channel.isDefault || false
          }))
        },
        projectCreator: {
          hasService: workStatus.hasProjectCreatorService,
          serviceType: workStatus.projectCreatorServiceType
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // ========== YOUR EXISTING ENDPOINTS ==========

  @Get('developer/info')
  getDeveloperInfo() {
    return this.developerService.getAgentInfo();
  }

  @Post('developer/task')
  createDeveloperTask(@Body() createTaskDto: CreateTaskDto) {
    return this.developerService.createTask(createTaskDto);
  }

  @Get('developer/task/:taskId')
  getDeveloperTask(@Param('taskId') taskId: string) {
    return this.developerService.getTask(taskId);
  }

  @Get('developer/tasks')
  getAllDeveloperTasks() {
    return this.developerService.getAllTasks();
  }

  @Get('developer/repositories')
  getDeveloperRepositories() {
    return this.developerService.getRepositories();
  }

  @Post('debug/emergency-create-agents')
  async emergencyCreateAgents() {
    try {
      this.logger.log('🚨 Emergency agent creation started...');
      
      // Force create all default agents
      const defaultAgents = [
        {
          agentId: 'developer',
          name: 'Alex Developer',
          role: 'developer',
          avatar: 'https://ui-avatars.com/api/?name=Alex+Dev&background=4F46E5&color=fff',
          status: 'active',
          skills: ['JavaScript', 'React', 'Node.js', 'Git', 'MongoDB'],
          isOnline: true,
          bio: 'Full-stack developer specializing in modern web technologies'
        },
        {
          agentId: 'designer',
          name: 'Sarah Designer',
          role: 'designer',
          avatar: 'https://ui-avatars.com/api/?name=Sarah+Design&background=EC4899&color=fff',
          status: 'active',
          skills: ['UI/UX', 'Figma', 'Adobe Creative Suite', 'Prototyping'],
          isOnline: true,
          bio: 'UI/UX designer focused on user-centered design'
        },
        {
          agentId: 'qa',
          name: 'Emma QA',
          role: 'qa',
          avatar: 'https://ui-avatars.com/api/?name=Emma+QA&background=10B981&color=fff',
          status: 'active',
          skills: ['Testing', 'Automation', 'Bug Tracking', 'Quality Assurance'],
          isOnline: true,
          bio: 'Quality assurance engineer ensuring product reliability'
        },
        {
          agentId: 'manager',
          name: 'Mike Manager',
          role: 'manager',
          avatar: 'https://ui-avatars.com/api/?name=Mike+Manager&background=F59E0B&color=fff',
          status: 'active',
          skills: ['Project Management', 'Planning', 'Coordination', 'Leadership'],
          isOnline: true,
          bio: 'Project manager coordinating team efforts'
        }
      ];

      const results: Array<{
        agentId: string;
        name: string;
        created: boolean;
        status: string;
        error?: string;
      }> = []; // Fixed typing
      
      for (const agentData of defaultAgents) {
        try {
          // Access the agentModel through the service
          const agentModel = (this.agentWorkService as any)['agentModel'];
          
          // Delete existing agent if it exists
          await agentModel.deleteOne({ agentId: agentData.agentId });
          
          // Create new agent
          const agent = new agentModel(agentData);
          await agent.save();
          
          // Verify it was created
          const verification = await agentModel.findOne({ agentId: agentData.agentId }).exec();
          
          results.push({
            agentId: agentData.agentId,
            name: agentData.name,
            created: !!verification,
            status: verification ? 'success' : 'failed'
          });
          
          this.logger.log(`✅ Emergency created agent: ${agentData.name}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            agentId: agentData.agentId,
            name: agentData.name,
            created: false,
            status: 'error',
            error: errorMessage
          });
          this.logger.error(`❌ Failed to create agent ${agentData.name}:`, error);
        }
      }

      return {
        success: true,
        message: 'Emergency agent creation completed',
        results
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  @Get('debug/database-health')
  async checkDatabaseHealth() {
    try {
      // Check agents
      const agents = await this.agentWorkService.getAllAgentsFromDB();
      const channels = await this.agentWorkService.getAllChannelsFromDB();
      
      // Check specific agents
      const requiredAgents = ['developer', 'designer', 'qa', 'manager'];
      const agentStatus: Record<string, any> = {}; // Fixed typing
      
      for (const agentId of requiredAgents) {
        const agent = agents.find((a: any) => a.agentId === agentId);
        agentStatus[agentId] = {
          exists: !!agent,
          name: agent?.name || null,
          role: agent?.role || null,
          isOnline: agent?.isOnline || false
        };
      }

      // Check required channels
      const requiredChannels = ['general', 'development', 'testing', 'management'];
      const channelStatus: Record<string, any> = {}; // Fixed typing
      
      for (const channelId of requiredChannels) {
        const channel = channels.find((c: any) => c.channelId === channelId);
        channelStatus[channelId] = {
          exists: !!channel,
          name: channel?.name || null,
          type: channel?.type || null
        };
      }

      return {
        success: true,
        database: {
          agents: {
            total: agents.length,
            required: requiredAgents.length,
            missing: requiredAgents.filter(id => !agents.find((a: any) => a.agentId === id)),
            status: agentStatus
          },
          channels: {
            total: channels.length,
            required: requiredChannels.length,
            missing: requiredChannels.filter(id => !channels.find((c: any) => c.channelId === id)),
            status: channelStatus
          }
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  @Delete('debug/clear-all-agents')
  async clearAllAgents() {
    try {
      const agentModel = (this.agentWorkService as any)['agentModel'];
      const result = await agentModel.deleteMany({});
      
      return {
        success: true,
        message: `Deleted ${result.deletedCount} agents`,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  @Delete('debug/clear-all-channels')
  async clearAllChannels() {
    try {
      const channelModel = (this.agentWorkService as any)['channelModel'];
      const result = await channelModel.deleteMany({});
      
      return {
        success: true,
        message: `Deleted ${result.deletedCount} channels`,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  @Post('chat/message')
async handleChatMessage(
  @Headers('x-session-id') sessionId: string,
  @Body() data: {
    message: string;
    channelId: string;
  }
) {
  try {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { success: false, error: 'Invalid session' };
    }
    
    // Process the message for commands
    await this.agentWorkService.handleChatMessage(
      data.channelId,
      user.id,
      user.name,
      data.message
    );
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

@Post('request-review')
async requestPRReview(
  @Headers('x-session-id') sessionId: string,
  @Body() data: {
    repository: string;
    prNumber: number;
    description?: string;
    urgency?: 'low' | 'medium' | 'high';
    specificReviewers?: string[];
  }
) {
  try {
    // Validate user session
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { success: false, error: 'Invalid session' };
    }

    // Check if user has permission to request reviews
    const permissions = this.usersService.getUserPermissions(user.role);
    if (!permissions.canCreatePR) {
      return { success: false, error: 'You do not have permission to request reviews' };
    }

    // Get username from agentWorkService's config
    const username = await this.getGitHubUsername();
    
    // Create a task context for the review
    const reviewTask = {
      id: `user-review-${Date.now()}`,
      title: `Review PR #${data.prNumber}`,
      type: 'review' as const,
      priority: (data.urgency || 'medium') as 'low' | 'medium' | 'high',
      assignedTo: user.githubUsername,
      description: data.description || `User ${user.name} requested review for PR #${data.prNumber}`
    };

    const context = {
      repository: data.repository,
      projectId: `user-project-${user.id}`,
      username,
      channelId: 'general'
    };

    // Send notification to general channel
    await this.agentWorkService.realCommunicationService.sendAIMessage(
      'manager',
      'general',
      'general_update',
      {
        conversationTopic: 'review_request_announcement',
        userRequester: user.name,
        prNumber: data.prNumber,
        repository: data.repository,
        reviewers: data.specificReviewers?.join(', ') || 'automatic selection'
      }
    );

    // Call a public method on agentWorkService to handle the review
    await this.agentWorkService.handleUserPRReviewRequest(
      user.id,
      user.name,
      user.role,
      data.repository,
      data.prNumber,
      data.description,
      data.specificReviewers,
      context.channelId
    );

    return {
      success: true,
      message: `Review requested for PR #${data.prNumber}`,
      repository: data.repository
    };

  } catch (error) {
    this.logger.error('Error requesting PR review:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage
    };
  }
}

// Add this helper method to get GitHub username
private async getGitHubUsername(): Promise<string> {
  // You might need to add a method in agentWorkService to expose this
  // For now, return a default or get it from environment
  return process.env.GITHUB_USERNAME || 'default-username';
}

  @Post('debug/force-create-specific-agent/:agentId')
  async forceCreateSpecificAgent(@Param('agentId') agentId: string) {
    try {
      // Get default agent data
      const agentDataMap: Record<string, any> = {
        'developer': {
          agentId: 'developer',
          name: 'Alex Developer',
          role: 'developer',
          avatar: 'https://ui-avatars.com/api/?name=Alex+Dev&background=4F46E5&color=fff',
          status: 'active',
          skills: ['JavaScript', 'React', 'Node.js', 'Git'],
          isOnline: true,
          bio: 'Full-stack developer'
        },
        'designer': {
          agentId: 'designer',
          name: 'Sarah Designer',
          role: 'designer',
          avatar: 'https://ui-avatars.com/api/?name=Sarah+Design&background=EC4899&color=fff',
          status: 'active',
          skills: ['UI/UX', 'Figma'],
          isOnline: true,
          bio: 'UI/UX designer'
        },
        'qa': {
          agentId: 'qa',
          name: 'Emma QA',
          role: 'qa',
          avatar: 'https://ui-avatars.com/api/?name=Emma+QA&background=10B981&color=fff',
          status: 'active',
          skills: ['Testing', 'Automation'],
          isOnline: true,
          bio: 'Quality assurance engineer'
        },
        'manager': {
          agentId: 'manager',
          name: 'Mike Manager',
          role: 'manager',
          avatar: 'https://ui-avatars.com/api/?name=Mike+Manager&background=F59E0B&color=fff',
          status: 'active',
          skills: ['Project Management'],
          isOnline: true,
          bio: 'Project manager'
        }
      };

      const agentData = agentDataMap[agentId];
      if (!agentData) {
        return {
          success: false,
          error: `Unknown agent ID: ${agentId}. Available: ${Object.keys(agentDataMap).join(', ')}`
        };
      }

      const agentModel = (this.agentWorkService as any)['agentModel'];
      
      // Delete existing
      await agentModel.deleteOne({ agentId });
      
      // Create new
      const agent = new agentModel(agentData);
      await agent.save();
      
      // Verify
      const verification = await agentModel.findOne({ agentId }).exec();
      
      return {
        success: !!verification,
        message: verification ? `Agent ${agentId} created successfully` : `Failed to create agent ${agentId}`,
        agentId,
        created: !!verification
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: errorMessage,
        agentId
      };
    }
  }
 @Post('ask/:agentId')
async askAgent(
  @Param('agentId') agentId: string,
  @Body() data: { question: string; channelId?: string },
  @Headers('x-session-id') sessionId: string
) {
  try {
    // Get user info from session
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { success: false, error: 'Invalid session' };
    }

    const channelId = data.channelId || 'general';
    
    // Validate agent exists
    const validAgents = ['developer', 'designer', 'qa', 'manager'];
    if (!validAgents.includes(agentId)) {
      return { 
        success: false, 
        error: `Invalid agent. Available agents: ${validAgents.join(', ')}` 
      };
    }

    // Send question to agent
    await this.agentWorkService.askAgent(
      user.id,
      user.name || user.email,
      agentId,
      data.question,
      channelId
    );

    return {
      success: true,
      message: `Question sent to ${agentId}`,
      agentId,
      question: data.question
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage
    };
  }
}

@Post('mention')
async mentionAgent(
  @Body() data: { 
    agentId: string; 
    message: string; 
    channelId?: string 
  },
  @Headers('x-session-id') sessionId: string
) {
  try {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { success: false, error: 'Invalid session' };
    }

    const channelId = data.channelId || 'general';

    await this.agentWorkService.handleUserMention(
      channelId,
      data.agentId,
      data.message,
      user.id,
      user.name || user.email
    );

    return {
      success: true,
      message: `Mentioned ${data.agentId}`,
      agentId: data.agentId
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage
    };
  }
}

@Post('trigger-discussion')
async triggerTeamDiscussion(
  @Body() data: { 
    topic?: string;
    participants?: string[];
    duration?: number;
  },
  @Headers('x-session-id') sessionId: string
) {
  try {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { success: false, error: 'Invalid session' };
    }

    const topic = data.topic || 'general_work';
    const participants = data.participants || ['developer', 'designer', 'qa'];
    const duration = data.duration || 30000;

    // Trigger natural conversation through AgentWorkService
    await this.agentWorkService.realCommunicationService?.triggerNaturalConversation?.(
      'general',
      topic,
      participants,
      duration
    );

    return {
      success: true,
      message: `Started team discussion about: ${topic}`,
      topic,
      participants,
      duration
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage
    };
  }
}

@Get('communication-status')
getCommunicationStatus() {
  try {
    return {
      success: true,
      availableAgents: [
        {
          id: 'developer',
          name: 'Alex Thompson',
          role: 'Senior Full-Stack Developer',
          expertise: ['JavaScript', 'React', 'Node.js', 'Database Design']
        },
        {
          id: 'designer',
          name: 'Sarah Chen', 
          role: 'Senior UX/UI Designer',
          expertise: ['User Experience', 'Interface Design', 'Prototyping', 'Accessibility']
        },
        {
          id: 'qa',
          name: 'Emma Rodriguez',
          role: 'Senior QA Engineer', 
          expertise: ['Test Automation', 'Manual Testing', 'Performance Testing']
        },
        {
          id: 'manager',
          name: 'Mike Johnson',
          role: 'Technical Project Manager',
          expertise: ['Project Management', 'Team Leadership', 'Agile Methodologies']
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage
    };
  }
  
}
  
}