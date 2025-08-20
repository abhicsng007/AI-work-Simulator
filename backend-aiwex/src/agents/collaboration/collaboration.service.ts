import { Injectable } from '@nestjs/common';
import { GithubCollaborationService, PullRequestReview } from '../../github/github-collaboration.service';
import { DeveloperService } from '../developer/developer.service';
import { OpenAIService } from '../../openai/openai.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

export interface CollaborationTask {
  id: string;
  type: 'feature' | 'bugfix' | 'review' | 'sprint';
  title: string;
  description: string;
  repository: string;
  assignedAgents: string[];
  status: 'planning' | 'in-progress' | 'review' | 'completed';
  issueNumber?: number;
  pullRequestNumber?: number;
  branchName?: string;
}

@Injectable()
export class CollaborationService {
  private tasks = new Map<string, CollaborationTask>();
  private username: string;

  constructor(
    private githubCollabService: GithubCollaborationService,
    private developerService: DeveloperService,
    private openAIService: OpenAIService,
    private websocketGateway: WebsocketGateway,
    private configService: ConfigService,
  ) {
    this.username = this.configService.get<string>('GITHUB_USERNAME') || '';
  }

  // Create a feature with full workflow
  async createFeatureWorkflow(data: {
    issueTitle: string;
    description: string;
    assignedAgents: string[];
    repository: string;
    labels?: string[];
  }): Promise<CollaborationTask> {
    const task: CollaborationTask = {
      id: uuidv4(),
      type: 'feature',
      title: data.issueTitle,
      description: data.description,
      repository: data.repository,
      assignedAgents: data.assignedAgents,
      status: 'planning',
    };

    this.tasks.set(task.id, task);
    this.executeFeatureWorkflow(task, data.labels);

    return task;
  }

  private async executeFeatureWorkflow(task: CollaborationTask, labels?: string[]) {
    try {
      // 1. Create Issue
      this.websocketGateway.sendTaskUpdate(task.id, 'Creating GitHub issue...');
      const issue = await this.githubCollabService.createIssue(
        this.username,
        task.repository,
        task.title,
        this.generateIssueBody(task),
        task.assignedAgents,
        labels || ['enhancement', 'ai-generated'],
      );
      
      task.issueNumber = issue.number;
      task.status = 'in-progress';
      
      this.websocketGateway.sendTaskUpdate(task.id, `Issue #${issue.number} created`);

      // 2. Create Feature Branch
      const branchName = `feature/${task.title.toLowerCase().replace(/\s+/g, '-')}-${task.id.slice(0, 8)}`;
      await this.githubCollabService.createBranch(
        this.username,
        task.repository,
        branchName,
        'main',
      );
      
      task.branchName = branchName;
      this.websocketGateway.sendTaskUpdate(task.id, `Branch ${branchName} created`);

      // 3. Developer Agent writes code
      if (task.assignedAgents.includes('developer')) {
        this.websocketGateway.sendTaskUpdate(task.id, 'Developer agent is implementing the feature...');
        
        // Generate implementation plan
        const implementationPlan = await this.openAIService.generateCode(
          `Create an implementation plan for: ${task.description}`,
          'typescript',
        );

        // Add comment to issue with plan
        await this.githubCollabService.addIssueComment(
          this.username,
          task.repository,
          issue.number,
          `🤖 **Developer Agent Update**\n\nStarting implementation of this feature.\n\n**Plan:**\n${implementationPlan}`,
        );

        // Simulate code development (in real scenario, would generate actual code files)
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // 4. Create Pull Request
      this.websocketGateway.sendTaskUpdate(task.id, 'Creating pull request...');
      const pr = await this.githubCollabService.createPullRequest(
        this.username,
        task.repository,
        task.title,
        this.generatePRBody(task, issue.number),
        branchName,
        'main',
        task.assignedAgents,
        ['ready-for-review'],
      );
      
      task.pullRequestNumber = pr.number;
      task.status = 'review';
      
      this.websocketGateway.sendTaskUpdate(task.id, `Pull request #${pr.number} created`);

      // 5. QA Agent reviews
      if (task.assignedAgents.includes('qa')) {
        await this.performQAReview(task);
      }

      // 6. Manager approves
      if (task.assignedAgents.includes('manager')) {
        await this.performManagerReview(task);
      }

      // 7. Merge PR
      await this.attemptMerge(task);

      task.status = 'completed';
      this.websocketGateway.sendTaskUpdate(task.id, 'Feature workflow completed!');

    } catch (error) {
      console.error('Feature workflow error:', error);
      this.websocketGateway.sendTaskUpdate(task.id, `Error: ${error.message}`);
    }
  }

  private async performQAReview(task: CollaborationTask) {
    this.websocketGateway.sendTaskUpdate(task.id, 'QA Agent is reviewing the code...');
    
    // Simulate QA analysis
    const qaAnalysis = await this.openAIService.analyzeCode(
      'Sample code for QA review', // In real scenario, would fetch PR files
    );

    const review: PullRequestReview = {
      body: `🔍 **QA Agent Review**\n\n${qaAnalysis}\n\n✅ All tests pass\n✅ No critical issues found`,
      event: 'APPROVE',
    };

    await this.githubCollabService.reviewPullRequest(
      this.username,
      task.repository,
      task.pullRequestNumber!,
      review,
    );

    this.websocketGateway.sendTaskUpdate(task.id, 'QA review completed - Approved');
  }

  private async performManagerReview(task: CollaborationTask) {
    this.websocketGateway.sendTaskUpdate(task.id, 'Manager Agent is reviewing business requirements...');
    
    const review: PullRequestReview = {
      body: `📊 **Manager Agent Review**\n\n✅ Meets business requirements\n✅ Aligns with project goals\n✅ Ready for deployment`,
      event: 'APPROVE',
    };

    await this.githubCollabService.reviewPullRequest(
      this.username,
      task.repository,
      task.pullRequestNumber!,
      review,
    );

    this.websocketGateway.sendTaskUpdate(task.id, 'Manager review completed - Approved');
  }

  private async attemptMerge(task: CollaborationTask) {
    // Check if PR is ready to merge
    const status = await this.githubCollabService.checkPullRequestStatus(
      this.username,
      task.repository,
      task.pullRequestNumber!,
    );

    if (status.mergeable) {
      this.websocketGateway.sendTaskUpdate(task.id, 'Merging pull request...');
      
      await this.githubCollabService.mergePullRequest(
        this.username,
        task.repository,
        task.pullRequestNumber!,
        `Merge PR #${task.pullRequestNumber}: ${task.title}`,
        `Automated merge by AI collaboration system\n\nCloses #${task.issueNumber}`,
      );

      this.websocketGateway.sendTaskUpdate(task.id, 'Pull request merged successfully!');
    } else {
      this.websocketGateway.sendTaskUpdate(task.id, 'Pull request not mergeable - manual intervention required');
    }
  }

  // Sprint planning
  async createSprint(data: {
    projectName: string;
    sprintGoals: string[];
    duration: string;
    team: string[];
  }) {
    const sprintTask: CollaborationTask = {
      id: uuidv4(),
      type: 'sprint',
      title: `Sprint - ${new Date().toISOString().split('T')[0]}`,
      description: `Sprint goals: ${data.sprintGoals.join(', ')}`,
      repository: data.projectName,
      assignedAgents: data.team,
      status: 'planning',
    };

    this.tasks.set(sprintTask.id, sprintTask);

    // Create milestone
    const milestone = await this.githubCollabService.createMilestone(
      this.username,
      data.projectName,
      sprintTask.title,
      `Duration: ${data.duration}\n\nGoals:\n${data.sprintGoals.map(g => `- ${g}`).join('\n')}`,
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
    );

    // Create issues for each goal
    for (const goal of data.sprintGoals) {
      await this.githubCollabService.createIssue(
        this.username,
        data.projectName,
        goal,
        `Part of ${sprintTask.title}`,
        data.team,
        ['sprint-goal'],
        milestone.number,
      );
    }

    return sprintTask;
  }

  // Multi-agent code review
  async performMultiAgentReview(data: {
    repository: string;
    pullRequestNumber: number;
    reviewers: string[];
  }) {
    const reviewTask: CollaborationTask = {
      id: uuidv4(),
      type: 'review',
      title: `Review PR #${data.pullRequestNumber}`,
      description: 'Multi-agent code review',
      repository: data.repository,
      assignedAgents: data.reviewers,
      status: 'in-progress',
      pullRequestNumber: data.pullRequestNumber,
    };

    this.tasks.set(reviewTask.id, reviewTask);

    // Get PR files for review
    const files = await this.githubCollabService.getPullRequestFiles(
      this.username,
      data.repository,
      data.pullRequestNumber,
    );

    // Each agent reviews based on their expertise
    for (const reviewer of data.reviewers) {
      await this.performAgentReview(reviewTask, reviewer, files);
    }

    return reviewTask;
  }

  private async performAgentReview(task: CollaborationTask, agentRole: string, files: any[]) {
    const reviewPrompts = {
      developer: 'Review this code for best practices, performance, and maintainability',
      qa: 'Review this code for potential bugs, edge cases, and test coverage',
      designer: 'Review this code for UI/UX considerations and frontend best practices',
      manager: 'Review this code for business logic correctness and alignment with requirements',
    };

    const prompt = reviewPrompts[agentRole] || reviewPrompts.developer;
    
    // Simulate code review (in real scenario, would analyze actual file contents)
    const reviewComments = await this.openAIService.analyzeCode(`Review request: ${prompt}`);

    const review: PullRequestReview = {
      body: `🤖 **${agentRole.charAt(0).toUpperCase() + agentRole.slice(1)} Agent Review**\n\n${reviewComments}`,
      event: reviewComments.includes('issue') || reviewComments.includes('bug') ? 'REQUEST_CHANGES' : 'APPROVE',
    };

    await this.githubCollabService.reviewPullRequest(
      this.username,
      task.repository,
      task.pullRequestNumber!,
      review,
    );

    this.websocketGateway.sendTaskUpdate(task.id, `${agentRole} agent completed review`);
  }

  private generateIssueBody(task: CollaborationTask): string {
    return `## Description
${task.description}

## Assigned Agents
${task.assignedAgents.map(agent => `- @${agent}`).join('\n')}

## Acceptance Criteria
- [ ] Implementation complete
- [ ] Tests written and passing
- [ ] Code reviewed and approved
- [ ] Documentation updated

---
*This issue was created by the AI Work Simulator collaboration system*`;
  }

  private generatePRBody(task: CollaborationTask, issueNumber: number): string {
    return `## Summary
Implementation of ${task.title}

## Changes
- Implementation details will be added here
- Code follows best practices
- Tests included

## Related Issue
Closes #${issueNumber}

## Checklist
- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] Ready for review

## Assigned Reviewers
${task.assignedAgents.map(agent => `- @${agent}`).join('\n')}

---
*This PR was created by the AI Work Simulator collaboration system*`;
  }

  getTask(taskId: string): CollaborationTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): CollaborationTask[] {
    return Array.from(this.tasks.values());
  }
}