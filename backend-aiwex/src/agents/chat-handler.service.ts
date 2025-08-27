import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RealAgentCommunicationService } from './communication/real-agent-communication.service';
import { PrReviewService } from './pr-review.service';
import { ReviewContext } from './agent-work.interface';

@Injectable()
export class ChatHandlerService {
  private readonly logger = new Logger(ChatHandlerService.name);
  private reviewContexts = new Map<number, ReviewContext>();

  constructor(
    private configService: ConfigService,
    private realCommunicationService: RealAgentCommunicationService,
    private prReviewService: PrReviewService,
  ) {}

  async handleUserMention(
    channelId: string,
    mentionedAgentId: string,
    userMessage: string,
    userId: string,
    userName: string
  ): Promise<void> {
    await this.realCommunicationService.handleUserMention(
      channelId,
      mentionedAgentId,
      userMessage,
      userId,
      userName
    );
  }

  async askAgent(
    userId: string,
    userName: string,
    agentId: string,
    question: string,
    channelId: string = 'general'
  ): Promise<void> {
    try {
      this.logger.log(`User ${userName} asking ${agentId}: ${question}`);
      
      await this.realCommunicationService.sendAIMessage(
        agentId,
        channelId,
        'mention_response',
        {
          mentionedBy: userName,
          question: question,
          conversationTopic: 'user_question'
        },
        1500 + Math.random() * 2500
      );

    } catch (error) {
      this.logger.error('Error handling user question:', error);
    }
  }

  async handleChatMessage(
    channelId: string,
    userId: string,
    userName: string,
    message: string
  ): Promise<void> {
    try {
      const prReviewPattern = /review\s+PR\s*#?(\d+)\s+(?:in\s+|on\s+)?([a-zA-Z0-9-_]+)/i;
      const simplePrPattern = /review\s+#?(\d+)/i;
      
      let match = message.match(prReviewPattern);
      let prNumber: number | null = null;
      let repository: string | null = null;
      
      if (match) {
        prNumber = parseInt(match[1]);
        repository = match[2];
      } else {
        match = message.match(simplePrPattern);
        if (match) {
          prNumber = parseInt(match[1]);
          repository = 'ai-test-repo';
        }
      }
      
      if (prNumber && repository) {
        this.logger.log(`Detected PR review request: PR #${prNumber} in ${repository}`);
        
        await this.realCommunicationService.sendAIMessage(
          'manager',
          channelId,
          'general_update',
          {
            conversationTopic: 'pr_review_acknowledgment',
            userName: userName,
            prNumber: prNumber,
            repository: repository
          },
          500
        );
        
        await this.handlePRReviewRequest(
          userId,
          userName,
          channelId,
          repository,
          prNumber
        );
      }
      
      const statusPattern = /status\s+(?:of\s+)?PR\s*#?(\d+)/i;
      const statusMatch = message.match(statusPattern);
      
      if (statusMatch) {
        const prNum = parseInt(statusMatch[1]);
        await this.providePRStatus(channelId, prNum);
      }
      
    } catch (error) {
      this.logger.error('Error handling chat message:', error);
    }
  }

  private async handlePRReviewRequest(
    userId: string,
    userName: string,
    channelId: string,
    repository: string,
    prNumber: number
  ): Promise<void> {
    try {
      const username = this.configService.get<string>('GITHUB_USERNAME');
      
      const reviewTask = {
        id: `chat-review-${Date.now()}`,
        title: `Review PR #${prNumber}`,
        type: 'review' as const,
        priority: 'medium' as const,
        assignedTo: userName,
        description: `${userName} requested review via chat for PR #${prNumber}`
      };
      
      const context = {
        repository,
        projectId: `chat-review-${userId}`,
        username,
        channelId
      };
      
      this.storeReviewContext(prNumber, {
        repository,
        channelId,
        requestedBy: userName,
        status: 'in-progress',
        startTime: new Date()
      });
      
      const reviewers = await this.prReviewService.selectReviewersForChatRequest(reviewTask);
      
      await this.realCommunicationService.sendAIMessage(
        'manager',
        channelId,
        'general_update',
        {
          conversationTopic: 'reviewers_assigned',
          prNumber: prNumber,
          reviewers: reviewers.map(r => r.name).join(', '),
          repository: repository
        },
        2000
      );
      
      for (const reviewer of reviewers) {
        await this.prReviewService.performAgentReviewWithChatUpdates(
          reviewer,
          { name: userName, role: 'user' } as any,
          reviewTask,
          prNumber,
          context
        );
      }
      
    } catch (error) {
      this.logger.error('Error handling PR review request:', error);
      
      await this.realCommunicationService.sendAIMessage(
        'manager',
        channelId,
        'general_update',
        {
          conversationTopic: 'review_error',
          error: error.message,
          prNumber: prNumber
        }
      );
    }
  }

  private storeReviewContext(prNumber: number, context: ReviewContext): void {
    this.reviewContexts.set(prNumber, context);
  }

  private updateReviewContext(prNumber: number, updates: Partial<ReviewContext>): void {
    const existing = this.reviewContexts.get(prNumber) || {} as ReviewContext;
    this.reviewContexts.set(prNumber, { ...existing, ...updates });
  }

  private async providePRStatus(channelId: string, prNumber: number): Promise<void> {
    const context = this.reviewContexts.get(prNumber);
    
    if (!context) {
      await this.realCommunicationService.sendAIMessage(
        'manager',
        channelId,
        'general_update',
        {
          conversationTopic: 'pr_status_unknown',
          prNumber: prNumber
        }
      );
      return;
    }
    
    await this.realCommunicationService.sendAIMessage(
      'manager',
      channelId,
      'general_update',
      {
        conversationTopic: 'pr_status_report',
        prNumber: prNumber,
        status: context.status,
        repository: context.repository,
        requestedBy: context.requestedBy,
        reviews: context
      }
    );
  }
}