// src/agents/communication/real-agent-communication.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OpenAIService } from '../../openai/openai.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { Message, MessageDocument } from '../../database/schemas/message.schema';
import { Agent, AgentDocument } from '../../database/schemas/agent.schema';
import { Channel, ChannelDocument } from '../../database/schemas/channel.schema';

export interface AgentPersonality {
  name: string;
  role: string;
  personality: string;
  expertise: string[];
  communicationStyle: string;
  currentContext: {
    currentTask?: string;
    workStatus: string;
    mood: string;
    recentEvents: string[];
  };
}

export interface ConversationContext {
  projectId: string;
  channelId: string;
  recentMessages: Array<{
    agentId: string;
    content: string;
    timestamp: Date;
    mentions?: string[];
  }>;
  currentTopic?: string;
  activeParticipants: string[];
}

@Injectable()
export class RealAgentCommunicationService {
  private readonly logger = new Logger(RealAgentCommunicationService.name);
  private agentPersonalities = new Map<string, AgentPersonality>();
  private conversationContexts = new Map<string, ConversationContext>();

  constructor(
    private openAIService: OpenAIService,
    private websocketGateway: WebsocketGateway,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Agent.name) private agentModel: Model<AgentDocument>,
    @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>,
  ) {
    this.initializeAgentPersonalities();
  }

  // Initialize realistic agent personalities
  private initializeAgentPersonalities() {
    this.agentPersonalities.set('developer', {
      name: 'Alex Thompson',
      role: 'Senior Full-Stack Developer',
      personality: 'Analytical, detail-oriented, collaborative, loves clean code and solving complex problems. Gets excited about new technologies but values stability. Sometimes gets deep into technical details.',
      expertise: ['JavaScript', 'React', 'Node.js', 'Database Design', 'API Development', 'DevOps'],
      communicationStyle: 'Direct but friendly, uses technical terms naturally, often suggests practical solutions, shares code snippets and technical insights',
      currentContext: {
        workStatus: 'available',
        mood: 'focused',
        recentEvents: []
      }
    });

    this.agentPersonalities.set('designer', {
      name: 'Sarah Chen',
      role: 'Senior UX/UI Designer',
      personality: 'Creative, empathetic, user-focused, passionate about accessibility and inclusive design. Thinks visually and often relates technical decisions to user impact.',
      expertise: ['User Experience', 'Interface Design', 'Prototyping', 'Accessibility', 'Design Systems', 'User Research'],
      communicationStyle: 'Warm and encouraging, focuses on user impact, uses visual metaphors, asks clarifying questions about user needs',
      currentContext: {
        workStatus: 'available',
        mood: 'creative',
        recentEvents: []
      }
    });

    this.agentPersonalities.set('qa', {
      name: 'Emma Rodriguez',
      role: 'Senior QA Engineer',
      personality: 'Methodical, thorough, quality-obsessed, great at finding edge cases. Has a keen eye for details others miss. Advocates strongly for users and quality standards.',
      expertise: ['Test Automation', 'Manual Testing', 'Performance Testing', 'Security Testing', 'Bug Tracking', 'Quality Processes'],
      communicationStyle: 'Precise and thorough, asks probing questions, focuses on edge cases and potential issues, diplomatic but firm about quality',
      currentContext: {
        workStatus: 'available',
        mood: 'analytical',
        recentEvents: []
      }
    });

    this.agentPersonalities.set('manager', {
      name: 'Mike Johnson',
      role: 'Technical Project Manager',
      personality: 'Organized, supportive, big-picture thinker, excellent at facilitating collaboration. Balances business needs with team well-being.',
      expertise: ['Project Management', 'Team Leadership', 'Agile Methodologies', 'Stakeholder Communication', 'Risk Management'],
      communicationStyle: 'Encouraging and organized, focuses on team coordination and project goals, asks about blockers and timeline concerns',
      currentContext: {
        workStatus: 'available',
        mood: 'coordinating',
        recentEvents: []
      }
    });
  }

  // Generate real AI response for agent
  async generateAgentResponse(
    agentId: string, 
    trigger: 'task_start' | 'progress_update' | 'collaboration_request' | 'mention_response' | 'general_update' | 'question_response',
    context: {
      projectInfo?: any;
      currentTask?: any;
      mentionedBy?: string;
      question?: string;
      progressPercent?: number;
      recentMessages?: any[];
      conversationTopic?: string;
    }
  ): Promise<string> {
    const personality = this.agentPersonalities.get(agentId);
    if (!personality) {
      return `Hi! I'm ${agentId} and I'm ready to help with the project.`;
    }

    const conversationHistory = this.getRecentConversationHistory('general', 5);
    
    const prompt = this.buildAgentPrompt(personality, trigger, context, conversationHistory);
    
    try {
      const response = await this.openAIService.generateCode(prompt, 'text');
      
      // Update agent's context based on their response
      this.updateAgentContext(agentId, trigger, context, response);
      
      return this.sanitizeResponse(response);
    } catch (error) {
      this.logger.error(`Error generating response for ${agentId}:`, error);
      return this.getFallbackResponse(agentId, trigger);
    }
  }

  // Build contextual prompt for agent
  private buildAgentPrompt(
  personality: AgentPersonality,
  trigger: string,
  context: any,
  conversationHistory: any[]
): string {
  const basePrompt = `You are ${personality.name}, a ${personality.role} working on a software development project.

PERSONALITY & COMMUNICATION STYLE:
${personality.personality}
Communication style: ${personality.communicationStyle}
Your expertise: ${personality.expertise.join(', ')}

CURRENT CONTEXT:
- Your current mood: ${personality.currentContext.mood}
- Your work status: ${personality.currentContext.workStatus}
- Current task: ${context.currentTask?.title || personality.currentContext.currentTask || 'No specific task'}
- Recent events: ${personality.currentContext.recentEvents.join(', ') || 'Project just started'}

PROJECT CONTEXT:
${context.projectInfo ? `
- Project: ${context.projectInfo.name}
- Description: ${context.projectInfo.description}
- Tech Stack: ${context.projectInfo.techStack?.join(', ')}
- Features: ${context.projectInfo.features?.join(', ')}
` : 'Working on a software development project'}

RECENT TEAM CONVERSATION:
${conversationHistory.map(msg => `${msg.agentName}: ${msg.content}`).join('\n')}

CURRENT SITUATION:`;

  switch (trigger) {
    case 'task_start':
      return `${basePrompt}
You're starting work on a new task: "${context.currentTask?.title}"
Task description: ${context.currentTask?.description}
Task type: ${context.currentTask?.type}
Estimated effort: ${context.currentTask?.estimatedHours} hours

Respond naturally as ${personality.name} announcing that you're starting this task. Mention your approach and what you plan to do first. Be authentic to your personality.

Response (1-3 sentences):`;

    case 'github_activity':
      return `${basePrompt}
You just performed a GitHub activity: ${context.activityType}
Activity details: ${JSON.stringify(context.activityDetails)}

Share this GitHub activity with your team in a natural, conversational way. Explain what you did and why. Be specific about the technical details but keep it conversational. Show your personality - are you excited about progress, being methodical, or sharing insights?

Examples of good responses:
- "Just created a new feature branch 'feature/user-auth' for the authentication task. Time to implement those login endpoints! 🚀"
- "Committed the initial user interface components to the design-system branch. Added 5 new React components with proper TypeScript definitions."
- "Opened PR #23 for the checkout flow refactor. This should improve performance by about 30% based on my testing."

Response (1-3 sentences):`;

    case 'progress_update':
      return `${basePrompt}
You're ${context.progressPercent}% done with your current task: "${context.currentTask?.title}"

Share a natural progress update. Mention what you've accomplished, what you're working on now, and any interesting challenges or successes. Include any relevant GitHub activity like commits, branches, or PRs.

Response (1-3 sentences):`;

    case 'mention_response':
      return `${basePrompt}
${context.mentionedBy} mentioned you or asked you something. Here's what they said:
"${context.question}"

Respond naturally as ${personality.name}. Address their question or comment directly, be helpful, and maintain your personality. If it's work-related, provide useful information including any relevant GitHub links or technical details.

Response (1-3 sentences):`;

    case 'collaboration_request':
      return `${basePrompt}
You need to collaborate with the team on your current task: "${context.currentTask?.title}"
Reason for collaboration: ${context.conversationTopic}

Naturally ask for help, share information, or coordinate with team members. Be specific about what you need and why. Mention any relevant GitHub branches, PRs, or files.

Response (1-3 sentences):`;

    case 'general_update':
      // Handle different types of general updates
      if (context.conversationTopic === 'github_activity') {
        return `${basePrompt}
You just completed a GitHub activity: ${context.activityType}
Details: ${JSON.stringify(context.activityDetails)}

Share this accomplishment with your team naturally. Explain what you did and its impact on the project. Be authentic to your personality and role.

Response (1-2 sentences):`;
      } else if (context.conversationTopic === 'testing_update') {
        return `${basePrompt}
You just finished testing for task: "${context.taskTitle}"
Test results: ${context.testResults}

Share your testing results with the team. Be specific about what you tested and the outcomes. Show your QA personality - thorough and quality-focused.

Response (1-2 sentences):`;
      } else if (context.conversationTopic === 'error_report') {
        return `${basePrompt}
You encountered an issue while working on: "${context.taskTitle}"
Error: ${context.error}

Inform the team about this issue professionally. Explain what went wrong and ask for help if needed. Stay positive and solution-focused.

Response (1-2 sentences):`;
      } else {
        return `${basePrompt}
Share a natural, spontaneous update with your team. This could be about your work, something you discovered, a question you have, or just checking in with everyone.

Topic context: ${context.conversationTopic || 'general team update'}

Response (1-2 sentences):`;
      }

    case 'question_response':
      return `${basePrompt}
Someone asked: "${context.question}"

Provide a helpful, natural response based on your expertise and personality. If it's in your area of expertise, be detailed and helpful. Include any relevant GitHub links, code examples, or technical insights.

Response (1-3 sentences):`;

  case 'pr_review_acknowledgment':
    return `${basePrompt}
${context.userName} just requested a review for PR #${context.prNumber} in repository ${context.repository}.

Acknowledge the request professionally and let them know you're assigning the right reviewers.

Response (1-2 sentences):`;

  case 'reviewers_assigned':
    return `${basePrompt}
You're coordinating a PR review. PR #${context.prNumber} has been assigned to: ${context.reviewers}.

Inform the team about who will be reviewing and set expectations.

Response (1-2 sentences):`;

  case 'starting_review':
    return `${basePrompt}
You're about to review PR #${context.prNumber} in ${context.repository}.

Let the team know you're starting your review. Be professional and specific to your role.

Response (1 sentence):`;

  case 'review_completed':
    return `${basePrompt}
You just completed reviewing PR #${context.prNumber}.
Result: ${context.approved ? 'Approved' : context.changesRequested ? 'Changes Requested' : 'Comments Added'}
Summary: ${context.summary}

Share your review results with the team. Be constructive and helpful.

Response (2-3 sentences):`;

  case 'pr_merged_success':
    return `${basePrompt}
PR #${context.prNumber} has been successfully merged into ${context.repository}!
Merged by: ${context.mergedBy}

Celebrate this achievement with the team!

Response (1-2 sentences):`;

  case 'pr_status_report':
    return `${basePrompt}
Someone asked about the status of PR #${context.prNumber}.
Current status: ${context.status}
Repository: ${context.repository}
Requested by: ${context.requestedBy}

Provide a clear status update.

Response (1-2 sentences):`;

    default:
      return `${basePrompt}
Respond naturally as ${personality.name} in this situation. Keep it conversational and authentic to your personality.

Response:`;
  }
}
  // Update agent's context based on their actions
  private updateAgentContext(agentId: string, trigger: string, context: any, response: string) {
    const personality = this.agentPersonalities.get(agentId);
    if (!personality) return;

    // Update current task
    if (context.currentTask) {
      personality.currentContext.currentTask = context.currentTask.title;
    }

    // Update work status based on trigger
    switch (trigger) {
      case 'task_start':
        personality.currentContext.workStatus = 'working';
        personality.currentContext.mood = 'focused';
        break;
      case 'progress_update':
        if (context.progressPercent >= 75) {
          personality.currentContext.mood = 'accomplished';
        }
        break;
      case 'collaboration_request':
        personality.currentContext.workStatus = 'collaborating';
        break;
    }

    // Add recent event
    personality.currentContext.recentEvents.unshift(`${trigger}: ${response.substring(0, 50)}...`);
    if (personality.currentContext.recentEvents.length > 5) {
      personality.currentContext.recentEvents.pop();
    }
  }

  // Get recent conversation history for context
  private getRecentConversationHistory(channelId: string, limit: number = 5): any[] {
    const context = this.conversationContexts.get(channelId);
    if (!context) return [];

    return context.recentMessages
      .slice(-limit)
      .map(msg => ({
        agentName: this.getAgentName(msg.agentId),
        content: msg.content,
        timestamp: msg.timestamp
      }));
  }

  private getAgentName(agentId: string): string {
    const personality = this.agentPersonalities.get(agentId);
    return personality ? personality.name : agentId;
  }

  // Sanitize AI response
  private sanitizeResponse(response: string): string {
    // Remove any unwanted formatting, keep it natural
    return response
      .replace(/^Response:?\s*/i, '')
      .replace(/^\d+\.\s*/, '') // Remove numbered lists
      .replace(/^[-•]\s*/, '') // Remove bullet points
      .trim();
  }

  // Fallback responses if AI fails
  private getFallbackResponse(agentId: string, trigger: string): string {
    const personality = this.agentPersonalities.get(agentId);
    const name = personality?.name || agentId;
    
    switch (trigger) {
      case 'task_start':
        return `Starting work on my assigned task! ${name} is on it! 💪`;
      case 'progress_update':
        return `Making good progress on my current task. Things are moving along smoothly!`;
      case 'mention_response':
        return `Thanks for reaching out! Happy to help with whatever you need.`;
      default:
        return `${name} here, ready to contribute to the team! 🚀`;
    }
  }

  // Send AI-generated message to channel
  async sendAIMessage(
    agentId: string,
    channelId: string,
    trigger: string,
    context: any,
    delay: number = 0
  ): Promise<void> {
    try {
      // Add realistic delay
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Generate AI response
      const content = await this.generateAgentResponse(agentId, trigger as any, context);
      
      // Send message
      await this.sendMessage(agentId, channelId, content);
      
      // Update conversation context
      this.updateConversationContext(channelId, agentId, content);
      
      this.logger.log(`AI message sent: ${agentId} -> ${channelId}: ${content.substring(0, 50)}...`);
      
    } catch (error) {
      this.logger.error(`Error sending AI message:`, error);
    }
  }

  // Handle user mentions and questions
  async handleUserMention(
    channelId: string,
    mentionedAgentId: string,
    userMessage: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      // Extract the actual question/comment directed at the agent
      const question = this.extractMentionContext(userMessage, mentionedAgentId);
      
      // Generate contextual response
      const context = {
        mentionedBy: userName,
        question: question,
        conversationTopic: 'user_question',
        recentMessages: this.getRecentConversationHistory(channelId, 3)
      };

      // Generate response with slight delay for realism
      await this.sendAIMessage(
        mentionedAgentId,
        channelId,
        'mention_response',
        context,
        1500 + Math.random() * 2000 // 1.5-3.5 second delay
      );

    } catch (error) {
      this.logger.error(`Error handling user mention:`, error);
    }
  }

  // Extract question/context from user mention
  private extractMentionContext(message: string, agentId: string): string {
    // Remove the mention tag and get the actual question
    const agentName = this.getAgentName(agentId);
    const mentionPatterns = [
      `@${agentId}`,
      `@${agentName}`,
      `@${agentName.split(' ')[0]}` // First name
    ];

    let cleanMessage = message;
    mentionPatterns.forEach(pattern => {
      cleanMessage = cleanMessage.replace(new RegExp(pattern, 'gi'), '').trim();
    });

    return cleanMessage || message;
  }

  // Update conversation context
  private updateConversationContext(channelId: string, agentId: string, content: string) {
    let context = this.conversationContexts.get(channelId);
    if (!context) {
      context = {
        projectId: 'current',
        channelId,
        recentMessages: [],
        activeParticipants: []
      };
      this.conversationContexts.set(channelId, context);
    }

    context.recentMessages.push({
      agentId,
      content,
      timestamp: new Date()
    });

    // Keep only recent messages
    if (context.recentMessages.length > 20) {
      context.recentMessages = context.recentMessages.slice(-20);
    }

    // Track active participants
    if (!context.activeParticipants.includes(agentId)) {
      context.activeParticipants.push(agentId);
    }
  }

  // Send actual message to database and websocket
  private async sendMessage(agentId: string, channelId: string, content: string) {
    try {
      const agent = await this.agentModel.findOne({ agentId }).exec();
      const channel = await this.channelModel.findOne({ channelId }).exec();
      
      if (!agent || !channel) {
        this.logger.warn(`Cannot send message: agent ${agentId} or channel ${channelId} not found`);
        return;
      }

      const agentData = agent.toObject ? agent.toObject() : agent;

      const message = new this.messageModel({
        content,
        authorId: agentId,
        agentId,
        authorName: agentData.name,
        authorRole: agentData.role,
        channelId,
        channelObjectId: channel._id
      });

      await message.save();

      this.websocketGateway.sendAgentMessage({
        agentId,
        message: content,
        channel: channelId
      });

    } catch (error) {
      this.logger.error(`Error sending message to database:`, error);
    }
  }

  // Simulate natural conversation flow
  async triggerNaturalConversation(
    channelId: string,
    topic: string,
    participants: string[],
    duration: number = 30000 // 30 seconds
  ): Promise<void> {
    const startTime = Date.now();
    let messageCount = 0;
    const maxMessages = 8;

    while (Date.now() - startTime < duration && messageCount < maxMessages) {
      // Pick random participant to speak
      const speaker = participants[Math.floor(Math.random() * participants.length)];
      
      const context = {
        conversationTopic: topic,
        recentMessages: this.getRecentConversationHistory(channelId, 3)
      };

      await this.sendAIMessage(
        speaker,
        channelId,
        'general_update',
        context,
        Math.random() * 5000 // Random delay up to 5 seconds
      );

      messageCount++;
      
      // Wait before next message
      await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 7000)); // 3-10 seconds
    }
  }

  // Get agent current status for debugging
  getAgentStatus(agentId: string): any {
    const personality = this.agentPersonalities.get(agentId);
    return personality ? {
      name: personality.name,
      role: personality.role,
      currentContext: personality.currentContext,
      mood: personality.currentContext.mood,
      workStatus: personality.currentContext.workStatus
    } : null;
  }

  // Update agent mood/status manually
  updateAgentMood(agentId: string, mood: string, workStatus?: string) {
    const personality = this.agentPersonalities.get(agentId);
    if (personality) {
      personality.currentContext.mood = mood;
      if (workStatus) {
        personality.currentContext.workStatus = workStatus;
      }
    }
  }
}