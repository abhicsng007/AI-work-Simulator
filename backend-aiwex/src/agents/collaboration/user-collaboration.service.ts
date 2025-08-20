import { Injectable, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { CollaborationService } from './collaboration.service';
import { GithubCollaborationService } from '../../github/github-collaboration.service';
import { OpenAIService } from '../../openai/openai.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { ConfigService } from '@nestjs/config';

export interface UserTask {
  id: string;
  userId: string;
  type: 'feature' | 'bugfix' | 'review' | 'learning';
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  mentorAgents: string[]; // AI agents that will help
  status: 'assigned' | 'in-progress' | 'review' | 'completed';
  learningObjectives: string[];
  feedback?: string;
  score?: number;
}

@Injectable()
export class UserCollaborationService {
  private userTasks = new Map<string, UserTask[]>();

  constructor(
    private usersService: UsersService,
    private collaborationService: CollaborationService,
    private githubCollabService: GithubCollaborationService,
    private openAIService: OpenAIService,
    private websocketGateway: WebsocketGateway,
    private configService: ConfigService,
  ) {}

  // User creates a feature with AI guidance
  async userCreateFeature(userId: string, data: {
    title: string;
    description: string;
    repository: string;
    requestGuidance: boolean;
  }) {
    // Check permissions
    await this.usersService.validatePermission(userId, 'canCreatePR');
    
    const user = await this.usersService.getUserById(userId);
    if (!user) throw new Error('User not found');
    
    const username = this.configService.get<string>('GITHUB_username');

    // Create issue
    const issue = await this.githubCollabService.createIssue(
      username!,
      data.repository,
      data.title,
      `${data.description}\n\n**Created by:** ${user.name} (${user.role})`,
      [user.githubUsername],
      ['user-created', user.role],
    );

    // If user requests guidance, AI agents provide help
    if (data.requestGuidance) {
      const guidance = await this.getAIGuidance(user.role, data.title, data.description);
      
      await this.githubCollabService.addIssueComment(
        username!,
        data.repository,
        issue.number,
        `🤖 **AI Developer Assistant**\n\n${guidance}`,
      );
    }

    // Create a task for tracking
    const task: UserTask = {
      id: issue.id.toString(),
      userId,
      type: 'feature',
      title: data.title,
      description: data.description,
      difficulty: this.assessDifficulty(data.description),
      mentorAgents: ['developer'],
      status: 'assigned',
      learningObjectives: this.generateLearningObjectives(user.role, data.title),
    };

    this.addUserTask(userId, task);

    // Update user stats
    this.usersService.updateUserStats(userId, {
      issuesCreated: user.stats.issuesCreated + 1,
    });

    return { issue, task };
  }

  // User submits PR for review
  async userSubmitPR(userId: string, data: {
    repository: string;
    branch: string;
    title: string;
    description: string;
    issueNumber?: number;
  }) {
    await this.usersService.validatePermission(userId, 'canCreatePR');
    
    const user = await this.usersService.getUserById(userId);
    if (!user) throw new Error('User not found');
    
    const username = this.configService.get<string>('GITHUB_username');

    // Create PR
    const pr = await this.githubCollabService.createPullRequest(
      username!,
      data.repository,
      data.title,
      `${data.description}\n\n**Submitted by:** ${user.name} (${user.role})${data.issueNumber ? `\n\nCloses #${data.issueNumber}` : ''}`,
      data.branch,
      'main',
      [user.githubUsername],
      [user.role, 'needs-review'],
    );

    // Assign AI agents for review based on user's role
    const reviewers = this.getReviewersForRole(user.role);
    
    // AI agents provide educational review
    for (const reviewer of reviewers) {
      await this.performEducationalReview(pr.number, data.repository, reviewer, user.role);
    }

    // Update user stats
    this.usersService.updateUserStats(userId, {
      prsCreated: user.stats.prsCreated + 1,
    });

    return pr;
  }

  // User reviews code (if permitted)
  async userReviewPR(userId: string, data: {
    repository: string;
    pullNumber: number;
    comments: string;
    approval: 'approve' | 'request-changes' | 'comment';
  }) {
    await this.usersService.validatePermission(userId, 'canReviewCode');
    
    const user = await this.usersService.getUserById(userId);
    if (!user) throw new Error('User not found');
    
    const username = this.configService.get<string>('GITHUB_username');

    // Submit review
    await this.githubCollabService.reviewPullRequest(
      username!,
      data.repository,
      data.pullNumber,
      {
        body: `**Review by ${user.name} (${user.role})**\n\n${data.comments}`,
        event: data.approval === 'approve' ? 'APPROVE' : 
               data.approval === 'request-changes' ? 'REQUEST_CHANGES' : 'COMMENT',
      },
    );

    // AI mentor provides feedback on the review quality
    if (user.role === 'junior-developer' || user.role === 'qa-engineer') {
      const feedback = await this.getReviewFeedback(data.comments, user.role);
      
      await this.githubCollabService.addIssueComment(
        username!,
        data.repository,
        data.pullNumber,
        `🎓 **AI Mentor Feedback on Your Review**\n\n${feedback}`,
      );
    }

    // Update user stats
    this.usersService.updateUserStats(userId, {
      prsReviewed: user.stats.prsReviewed + 1,
    });

    return { success: true };
  }

  // Learning exercises
  async createLearningExercise(userId: string, skillLevel: string) {
    const user = await this.usersService.getUserById(userId);
    if (!user) throw new Error('User not found');
    
    const exercises = {
      'junior-developer': {
        easy: {
          title: 'Fix a typo in documentation',
          description: 'Find and fix spelling errors in README files',
          objectives: ['Learn Git basics', 'Practice creating PRs'],
        },
        medium: {
          title: 'Add input validation',
          description: 'Add validation to prevent invalid data in forms',
          objectives: ['Understand validation patterns', 'Write defensive code'],
        },
        hard: {
          title: 'Implement a new API endpoint',
          description: 'Create a complete CRUD endpoint with tests',
          objectives: ['API design', 'Testing strategies', 'Error handling'],
        },
      },
      'qa-engineer': {
        easy: {
          title: 'Write test cases for login',
          description: 'Create comprehensive test cases for authentication',
          objectives: ['Test case design', 'Edge case thinking'],
        },
        medium: {
          title: 'Create automated test suite',
          description: 'Build automated tests for critical user flows',
          objectives: ['Test automation', 'CI/CD integration'],
        },
        hard: {
          title: 'Performance testing strategy',
          description: 'Design and implement performance tests',
          objectives: ['Performance metrics', 'Load testing', 'Optimization'],
        },
      },
    };

    const exercise = exercises[user.role]?.[skillLevel] || exercises['junior-developer']['easy'];
    
    const task: UserTask = {
      id: `learning-${Date.now()}`,
      userId,
      type: 'learning',
      title: exercise.title,
      description: exercise.description,
      difficulty: skillLevel as any,
      mentorAgents: ['developer', 'qa'],
      status: 'assigned',
      learningObjectives: exercise.objectives,
    };

    this.addUserTask(userId, task);
    return task;
  }

  // Helper methods
  private async getAIGuidance(role: string, title: string, description: string): Promise<string> {
    const prompt = `As a senior developer mentor, provide guidance to a ${role} who wants to implement: "${title}". 
    Description: ${description}
    
    Provide:
    1. Step-by-step approach
    2. Best practices to follow
    3. Common pitfalls to avoid
    4. Resources to learn more`;

    return this.openAIService.generateCode(prompt, 'markdown');
  }

  private async performEducationalReview(prNumber: number, repository: string, reviewer: string, userRole: string) {
    const username = this.configService.get<string>('GITHUB_username');
    
    // Get PR files
    const files = await this.githubCollabService.getPullRequestFiles(username!, repository, prNumber);
    
    // Generate educational review
    const reviewPrompt = `As a ${reviewer} agent reviewing code from a ${userRole}, provide an educational code review that:
    1. Points out what was done well
    2. Suggests improvements with explanations
    3. Teaches best practices
    4. Encourages learning
    
    Be supportive and educational, not critical.`;

    const review = await this.openAIService.analyzeCode(reviewPrompt);

    await this.githubCollabService.reviewPullRequest(
      username!,
      repository,
      prNumber,
      {
        body: `🎓 **${reviewer.toUpperCase()} Agent Educational Review**\n\n${review}`,
        event: 'COMMENT',
      },
    );
  }

  private async getReviewFeedback(reviewComments: string, role: string): Promise<string> {
    const prompt = `Analyze this code review written by a ${role}: "${reviewComments}"
    
    Provide feedback on:
    1. Was the review constructive?
    2. Did they catch important issues?
    3. How could the review be improved?
    4. What did they do well?`;

    return this.openAIService.analyzeCode(prompt);
  }

  private getReviewersForRole(role: string): string[] {
    const reviewerMap = {
      'junior-developer': ['developer', 'qa'],
      'senior-developer': ['developer'],
      'qa-engineer': ['qa', 'developer'],
      'product-manager': ['manager', 'developer'],
      'ui-ux-designer': ['designer', 'developer'],
    };

    return reviewerMap[role] || ['developer'];
  }

  private assessDifficulty(description: string): 'easy' | 'medium' | 'hard' {
    const keywords = {
      easy: ['typo', 'documentation', 'rename', 'simple'],
      medium: ['feature', 'endpoint', 'component', 'refactor'],
      hard: ['architecture', 'migration', 'performance', 'security'],
    };

    const lowerDesc = description.toLowerCase();
    
    if (keywords.hard.some(k => lowerDesc.includes(k))) return 'hard';
    if (keywords.medium.some(k => lowerDesc.includes(k))) return 'medium';
    return 'easy';
  }

  private generateLearningObjectives(role: string, title: string): string[] {
    const objectives = {
      'junior-developer': [
        'Practice Git workflow',
        'Learn code organization',
        'Understand testing basics',
        'Follow coding standards',
      ],
      'qa-engineer': [
        'Identify edge cases',
        'Write comprehensive tests',
        'Document test scenarios',
        'Collaborate with developers',
      ],
      'product-manager': [
        'Define clear requirements',
        'Prioritize features',
        'Communicate with stakeholders',
        'Track project progress',
      ],
    };

    return objectives[role] || objectives['junior-developer'];
  }

  private addUserTask(userId: string, task: UserTask) {
    if (!this.userTasks.has(userId)) {
      this.userTasks.set(userId, []);
    }
    this.userTasks.get(userId)!.push(task);
  }

  getUserTasks(userId: string): UserTask[] {
    return this.userTasks.get(userId) || [];
  }
}