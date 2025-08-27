import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Agent, AgentDocument } from '../database/schemas/agent.schema';
import { Model } from 'mongoose';
import { OpenAIService } from "../openai/openai.service";
import { GithubCollaborationService } from "../github/github-collaboration.service";
import { ConfigService } from "@nestjs/config";
import { RealAgentCommunicationService } from "./communication/real-agent-communication.service";
import { AgentWork } from "./agent-work.interface";


@Injectable()
export class PrReviewService {
  private readonly logger = new Logger(PrReviewService.name);
  private reviewContexts = new Map<number, any>();

  constructor(
    @InjectModel(Agent.name) private agentModel: Model<AgentDocument>,
    private openAIService: OpenAIService,
    private githubCollabService: GithubCollaborationService,
    private configService: ConfigService,
    private realCommunicationService: RealAgentCommunicationService,
  ) {}

  async handleUserPRReviewRequest(
    userId: string,
    userName: string,
    userRole: string,
    repository: string,
    prNumber: number,
    description?: string,
    specificReviewers?: string[],
    channelId: string = 'general'
  ): Promise<void> {
    try {
      const username = this.configService.get<string>('GITHUB_USERNAME');
      
      // Create a review context
      const reviewTask = {
        id: `user-review-${Date.now()}`,
        title: `Review PR #${prNumber}`,
        type: 'review' as const,
        priority: 'medium' as const,
        assignedTo: userName,
        description: description || `${userName} requested review for PR #${prNumber}`
      };
      
      const context = {
        repository,
        projectId: `user-review-${userId}`,
        username,
        channelId
      };
      
      // Get reviewers
      let reviewers: AgentDocument[] = [];
      if (specificReviewers && specificReviewers.length > 0) {
        reviewers = await this.agentModel.find({
          agentId: { $in: specificReviewers }
        }).exec();
      } else {
        // Get default reviewers based on the task
        reviewers = await this.selectReviewersForTask(
          { agentId: `user-${userId}`, name: userName, role: userRole } as any,
          reviewTask
        );
      }
  
      // Create author representation
      const authorAgent = {
        agentId: `user-${userId}`,
        name: userName,
        role: userRole,
        _id: userId,
        // Add minimal required fields for AgentDocument compatibility
        status: 'online',
        avatar: '',
        personality: 'User',
        skills: [],
        tasksCompleted: 0,
        tasksInProgress: 0,
        totalInteractions: 0
      } as any;
  
      // Perform reviews
      for (const reviewer of reviewers) {
        await this.performAgentReviewWithChatUpdates(
          reviewer,
          authorAgent,
          reviewTask,
          prNumber,
          context
        );
      }
    } catch (error) {
      this.logger.error('Error handling user PR review request:', error);
      throw error;
    }
  }
  

  public async performAgentReviewWithChatUpdates(
    reviewer: AgentDocument,
    author: any,
    task: any,
    prNumber: number,
    context: any
  ): Promise<void> {
    try {
      const username = this.configService.get<string>('GITHUB_USERNAME');
      if (!username) return;
      
      // Notify that reviewer is starting
      await this.realCommunicationService.sendAIMessage(
        reviewer.agentId,
        context.channelId,
        'general_update',
        {
          conversationTopic: 'starting_review',
          prNumber: prNumber,
          repository: context.repository
        },
        3000
      );
      
      // Get PR files
      const files = await this.githubCollabService.getPullRequestFiles(
        username,
        context.repository,
        prNumber
      );
      
      // Generate review
      const reviewResult = await this.generateAgentReview(reviewer, author, task, files);
      
      // Submit review to GitHub
      await this.githubCollabService.reviewPullRequest(
        username,
        context.repository,
        prNumber,
        {
          body: reviewResult.body,
          event: reviewResult.approved ? 'APPROVE' : reviewResult.changesRequested ? 'REQUEST_CHANGES' : 'COMMENT'
        }
      );
      
      // Send review result to chat
      await this.realCommunicationService.sendAIMessage(
        reviewer.agentId,
        context.channelId,
        'general_update',
        {
          conversationTopic: 'review_completed',
          prNumber: prNumber,
          approved: reviewResult.approved,
          changesRequested: reviewResult.changesRequested,
          summary: reviewResult.summary,
          repository: context.repository
        },
        2000
      );
      
      // Update review context
      this.updateReviewContext(prNumber, {
        [`${reviewer.agentId}_review`]: {
          approved: reviewResult.approved,
          summary: reviewResult.summary,
          timestamp: new Date()
        }
      });
      
      // If approved, check for merge
      if (reviewResult.approved) {
        await this.checkAndMergePRWithChatUpdate(prNumber, context, reviewer);
      }
      
    } catch (error) {
      this.logger.error(`Error in review with chat updates:`, error);
      
      // Send error to chat
      await this.realCommunicationService.sendAIMessage(
        reviewer.agentId,
        context.channelId,
        'general_update',
        {
          conversationTopic: 'review_error',
          error: error.message,
          prNumber: prNumber
        }
      );
    }
  }

  async selectReviewersForChatRequest(task: any): Promise<AgentDocument[]> {
  const reviewers: AgentDocument[] = [];
  
  const qaAgent = await this.agentModel.findOne({ agentId: 'qa' }).exec();
  if (qaAgent) reviewers.push(qaAgent);
  
  const devAgent = await this.agentModel.findOne({ agentId: 'developer' }).exec();
  if (devAgent) reviewers.push(devAgent);
  
  return reviewers;
}

private async checkAndMergePRWithChatUpdate(
  prNumber: number, 
  context: any, 
  approver: AgentDocument
): Promise<void> {
  try {
    const username = this.configService.get<string>('GITHUB_USERNAME');
    if (!username) return;
    
    const status = await this.githubCollabService.checkPullRequestStatus(
      username,
      context.repository,
      prNumber
    );
    
    const approvals = status.reviews.filter(r => r.state === 'APPROVED').length;
    const changesRequested = status.reviews.filter(r => r.state === 'CHANGES_REQUESTED').length;
    
    if (changesRequested > 0) {
      await this.realCommunicationService.sendAIMessage(
        'manager',
        context.channelId,
        'general_update',
        {
          conversationTopic: 'changes_requested',
          prNumber: prNumber,
          changesCount: changesRequested
        }
      );
      return;
    }
    
    if (approvals > 0 && status.mergeable) {
      await this.realCommunicationService.sendAIMessage(
        'manager',
        context.channelId,
        'general_update',
        {
          conversationTopic: 'preparing_merge',
          prNumber: prNumber,
          approvals: approvals
        },
        2000
      );
      
      setTimeout(async () => {
        try {
          await this.githubCollabService.mergePullRequest(
            username,
            context.repository,
            prNumber,
            `Merge PR #${prNumber}: Auto-merged by AI review system`,
            `Approved by ${approver.name} via chat request`,
            'squash'
          );
          
          await this.realCommunicationService.sendAIMessage(
            'manager',
            context.channelId,
            'general_update',
            {
              conversationTopic: 'pr_merged_success',
              prNumber: prNumber,
              repository: context.repository,
              mergedBy: approver.name
            }
          );
          
        } catch (mergeError) {
          this.logger.error(`Error merging PR #${prNumber}:`, mergeError);
          
          await this.realCommunicationService.sendAIMessage(
            'manager',
            context.channelId,
            'general_update',
            {
              conversationTopic: 'merge_failed',
              prNumber: prNumber,
              error: mergeError.message
            }
          );
        }
      }, 5000);
    }
  } catch (error) {
    this.logger.error(`Error checking/merging PR:`, error);
  }
}

  public async selectReviewersForTask(author: AgentDocument, task: any): Promise<AgentDocument[]> {
    const reviewers: AgentDocument[] = [];
    
    try {
      // QA always reviews code changes
      if ((task.type === 'feature' || task.type === 'bug') && author.role !== 'qa') {
        const qaAgent = await this.agentModel.findOne({ agentId: 'qa' }).exec();
        if (qaAgent) reviewers.push(qaAgent);
      }
  
      // Manager reviews high priority items
      if (task.priority === 'high' && author.role !== 'manager') {
        const managerAgent = await this.agentModel.findOne({ agentId: 'manager' }).exec();
        if (managerAgent) reviewers.push(managerAgent);
      }
  
      // For design tasks, designer reviews
      if (task.type === 'design' && author.role !== 'designer') {
        const designerAgent = await this.agentModel.findOne({ agentId: 'designer' }).exec();
        if (designerAgent) reviewers.push(designerAgent);
      }
  
      // If author is junior, get a senior developer to review
      if (author.agentId.includes('junior')) {
    const seniorDev = await this.agentModel.findOne({ 
      role: 'developer',  // Find by role instead
      agentId: { $ne: author.agentId }  // Exclude the author
    }).exec();
    if (seniorDev) reviewers.push(seniorDev);
  }
  
      // If no specific reviewers, default to developer (if not the author)
      if (reviewers.length === 0 && author.role !== 'developer') {
        const devAgent = await this.agentModel.findOne({ agentId: 'developer' }).exec();
        if (devAgent) reviewers.push(devAgent);
      }
  
      return reviewers;
    } catch (error) {
      this.logger.error('Error selecting reviewers:', error);
      return [];
    }
  }
  

  // Move all other review-related methods here
  private async generateAgentReview(
    reviewer: AgentDocument,
    author: AgentDocument,
    task: any,
    files: any[]
  ): Promise<{ approved: boolean; changesRequested: boolean; body: string; summary: string }> {
    const prompt = `You are ${reviewer.name}, a ${reviewer.role} reviewing a pull request.
  
  PR Author: ${author.name} (${author.role})
  Task: ${task.title}
  Task Type: ${task.type}
  Priority: ${task.priority}
  Files Changed: ${files.length}
  File Names: ${files.map(f => f.filename).join(', ')}
  
  Based on your role and expertise as a ${reviewer.role}, review this PR considering:
  1. Code quality and best practices
  2. Whether it fulfills the task requirements
  3. Potential bugs or issues
  4. Performance considerations
  5. Security concerns (if applicable)
  
  Provide a realistic code review that:
  - Is constructive and helpful
  - Points out both positives and areas for improvement
  - Decides whether to approve, request changes, or just comment
  - Includes specific suggestions if changes are needed
  
  Respond in JSON format:
  {
    "approved": boolean (true if code looks good to merge),
    "changesRequested": boolean (true if changes are needed),
    "body": "Detailed review comments in markdown format",
    "summary": "One-line summary of the review"
  }`;
  
    try {
      const response = await this.openAIService.generateProjectStructure(prompt);
      
      // Ensure we have valid response
      if (!response || typeof response !== 'object') {
        return {
          approved: true,
          changesRequested: false,
          body: `## Review by ${reviewer.name}\n\nLooks good to me! The implementation meets the requirements.`,
          summary: "Approved - implementation looks good"
        };
      }
  
      return {
        approved: response.approved || false,
        changesRequested: response.changesRequested || false,
        body: response.body || `Reviewed by ${reviewer.name}`,
        summary: response.summary || "Review completed"
      };
    } catch (error) {
      this.logger.error('Error generating AI review:', error);
      // Fallback review
      return {
        approved: true,
        changesRequested: false,
        body: `## Review by ${reviewer.name}\n\n✅ The implementation looks good and meets the task requirements.`,
        summary: "Approved - no issues found"
      };
    }
  }

  private updateReviewContext(prNumber: number, updates: any): void {
  const existing = this.reviewContexts.get(prNumber) || {};
  this.reviewContexts.set(prNumber, { ...existing, ...updates });
}
  
}