import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { GithubService } from './github.service';

export interface PullRequestReview {
  body: string;
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  comments?: Array<{
    path: string;
    line: number;
    body: string;
  }>;
}

@Injectable()
export class GithubCollaborationService {
  private readonly logger = new Logger(GithubCollaborationService.name);
  private octokit: Octokit;
  private username: string;

  constructor(
    private configService: ConfigService,
    private githubService: GithubService,
  ) {
    const token = this.configService.get<string>('GITHUB_TOKEN');
    if (!token) {
      throw new Error('GITHUB_TOKEN is required but not provided');
    }

    this.octokit = new Octokit({
      auth: token,
    });
    this.username = this.configService.get<string>('GITHUB_USERNAME') || '';
  }

  // Branch Management with better error handling
  async createBranch(
    owner: string,
    repo: string,
    branchName: string,
    baseBranch: string = 'main',
  ): Promise<any> {
    try {
      // Check if branch already exists
      try {
        await this.octokit.git.getRef({
          owner,
          repo,
          ref: `heads/${branchName}`,
        });
        this.logger.warn(`Branch ${branchName} already exists`);
        return { message: 'Branch already exists' };
      } catch (error) {
        // Branch doesn't exist, continue with creation
      }

      // Get the SHA of the base branch
      const { data: refData } = await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${baseBranch}`,
      });

      // Create new branch
      const { data: newBranch } = await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha,
      });

      this.logger.log(`Successfully created branch: ${branchName}`);
      return newBranch;
    } catch (error) {
      this.logger.error(`Error creating branch ${branchName}:`, error);
      if (error.status === 404) {
        throw new Error(`Repository ${owner}/${repo} or base branch ${baseBranch} not found`);
      }
      if (error.status === 422) {
        throw new Error(`Branch ${branchName} already exists or invalid branch name`);
      }
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  // Enhanced Pull Request Management
  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string = 'main',
    assignees?: string[],
    labels?: string[],
  ): Promise<any> {
    try {
      // First, check if there are commits between head and base
      const comparison = await this.octokit.repos.compareCommits({
        owner,
        repo,
        base,
        head,
      });

      if (comparison.data.total_commits === 0) {
        const errorMsg = `No commits between ${base} and ${head}. Cannot create pull request.`;
        this.logger.warn(errorMsg);
        throw new Error(errorMsg);
      }

      this.logger.log(`Found ${comparison.data.total_commits} commits between ${base} and ${head}`);

      const { data: pr } = await this.octokit.pulls.create({
        owner,
        repo,
        title,
        body,
        head,
        base,
      });

      // Add assignees if provided
      if (assignees && assignees.length > 0) {
        try {
          await this.octokit.issues.addAssignees({
            owner,
            repo,
            issue_number: pr.number,
            assignees,
          });
        } catch (error) {
          this.logger.warn(`Failed to add assignees: ${error.message}`);
        }
      }

      // Add labels if provided
      if (labels && labels.length > 0) {
        try {
          await this.octokit.issues.addLabels({
            owner,
            repo,
            issue_number: pr.number,
            labels,
          });
        } catch (error) {
          this.logger.warn(`Failed to add labels: ${error.message}`);
        }
      }

      this.logger.log(`Successfully created pull request #${pr.number}: ${title}`);
      return pr;
    } catch (error) {
      this.logger.error(`Error creating pull request:`, error);
      if (error.status === 422) {
        throw new Error(`Pull request validation failed: ${error.message}`);
      }
      if (error.status === 404) {
        throw new Error(`Repository ${owner}/${repo} or branch not found`);
      }
      throw new Error(`Failed to create pull request: ${error.message}`);
    }
  }

  // Enhanced Issue Management
  async createIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
    assignees?: string[],
    labels?: string[],
    milestone?: number,
  ): Promise<any> {
    try {
      // Validate inputs
      if (!owner || !repo || !title) {
        throw new Error('Owner, repo, and title are required');
      }

      // Check if repository exists and is accessible
      try {
        await this.octokit.repos.get({ owner, repo });
      } catch (error) {
        if (error.status === 404) {
          throw new Error(`Repository ${owner}/${repo} not found or not accessible`);
        }
        throw error;
      }

      // Validate assignees exist if provided
      if (assignees && assignees.length > 0) {
        const collaborators = await this.getCollaborators(owner, repo);
        const collaboratorLogins = collaborators.map(c => c.login);
        
        const invalidAssignees = assignees.filter(assignee => !collaboratorLogins.includes(assignee));
        if (invalidAssignees.length > 0) {
          this.logger.warn(`Invalid assignees found: ${invalidAssignees.join(', ')}`);
          // Remove invalid assignees instead of failing
          assignees = assignees.filter(assignee => collaboratorLogins.includes(assignee));
        }
      }

      // Validate milestone exists if provided
      if (milestone) {
        try {
          await this.octokit.issues.getMilestone({
            owner,
            repo,
            milestone_number: milestone,
          });
        } catch (error) {
          if (error.status === 404) {
            this.logger.warn(`Milestone ${milestone} not found, creating issue without milestone`);
            milestone = undefined;
          }
        }
      }

      const { data: issue } = await this.octokit.issues.create({
        owner,
        repo,
        title,
        body: body || '',
        assignees: assignees || [],
        labels: labels || [],
        milestone,
      });

      this.logger.log(`Successfully created issue #${issue.number}: ${title}`);
      return issue;
    } catch (error) {
      this.logger.error(`Error creating issue:`, error);
      if (error.status === 422) {
        throw new Error(`Issue validation failed: ${error.message}`);
      }
      if (error.status === 404) {
        throw new Error(`Repository ${owner}/${repo} not found or not accessible`);
      }
      if (error.status === 403) {
        throw new Error(`Permission denied. Check if you have write access to ${owner}/${repo}`);
      }
      throw new Error(`Failed to create issue: ${error.message}`);
    }
  }

  // Enhanced Code Review
  async reviewPullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    review: PullRequestReview,
  ): Promise<any> {
    try {
      // Validate PR exists
      await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      });

      // Create the review
      const { data: reviewData } = await this.octokit.pulls.createReview({
        owner,
        repo,
        pull_number: pullNumber,
        body: review.body,
        event: review.event,
        comments: review.comments,
      });

      this.logger.log(`Successfully reviewed pull request #${pullNumber}`);
      return reviewData;
    } catch (error) {
      this.logger.error(`Error reviewing pull request:`, error);
      if (error.status === 404) {
        throw new Error(`Pull request #${pullNumber} not found`);
      }
      if (error.status === 422) {
        throw new Error(`Review validation failed: ${error.message}`);
      }
      throw new Error(`Failed to review pull request: ${error.message}`);
    }
  }

  // Enhanced Comments
  async addIssueComment(
    owner: string,
    repo: string,
    issueNumber: number,
    comment: string,
  ): Promise<any> {
    try {
      if (!comment || comment.trim().length === 0) {
        throw new Error('Comment body cannot be empty');
      }

      const { data } = await this.octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body: comment,
      });

      this.logger.log(`Successfully added comment to issue #${issueNumber}`);
      return data;
    } catch (error) {
      this.logger.error(`Error adding comment:`, error);
      if (error.status === 404) {
        throw new Error(`Issue #${issueNumber} not found`);
      }
      throw new Error(`Failed to add comment: ${error.message}`);
    }
  }

  // Enhanced Merge Pull Request
  async mergePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    commitTitle?: string,
    commitMessage?: string,
    mergeMethod: 'merge' | 'squash' | 'rebase' = 'squash',
  ): Promise<any> {
    try {
      // Check if PR is mergeable first
      const status = await this.checkPullRequestStatus(owner, repo, pullNumber);
      
      if (!status.mergeable) {
        throw new Error('Pull request is not mergeable. Check for conflicts or failing checks.');
      }

      const { data } = await this.octokit.pulls.merge({
        owner,
        repo,
        pull_number: pullNumber,
        commit_title: commitTitle,
        commit_message: commitMessage,
        merge_method: mergeMethod,
      });

      this.logger.log(`Successfully merged pull request #${pullNumber}`);
      return data;
    } catch (error) {
      this.logger.error(`Error merging pull request:`, error);
      if (error.status === 405) {
        throw new Error('Pull request cannot be merged. Check if it has conflicts or failing checks.');
      }
      throw new Error(`Failed to merge pull request: ${error.message}`);
    }
  }

  // Project Management (Note: GitHub Projects API has changed)
  async createProject(
    owner: string,
    repo: string,
    name: string,
    body: string,
  ): Promise<any> {
    try {
      // Note: This uses the legacy projects API which may be deprecated
      // Consider migrating to GitHub Projects V2 API
      const { data } = await this.octokit.projects.createForRepo({
        owner,
        repo,
        name,
        body,
      });

      this.logger.log(`Successfully created project: ${name}`);
      return data;
    } catch (error) {
      this.logger.error(`Error creating project:`, error);
      if (error.status === 410) {
        throw new Error('GitHub Projects (classic) API is deprecated. Consider using Projects V2.');
      }
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  // Get Pull Request Files
  async getPullRequestFiles(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<any[]> {
    try {
      const { data } = await this.octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
      });

      return data;
    } catch (error) {
      this.logger.error(`Error getting PR files:`, error);
      if (error.status === 404) {
        throw new Error(`Pull request #${pullNumber} not found`);
      }
      throw new Error(`Failed to get PR files: ${error.message}`);
    }
  }

  // Enhanced PR Status Check
  async checkPullRequestStatus(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<{
    mergeable: boolean;
    reviews: any[];
    checks: any;
    state: string;
  }> {
    try {
      // Get PR details
      const { data: pr } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      });

      // Get reviews
      const { data: reviews } = await this.octokit.pulls.listReviews({
        owner,
        repo,
        pull_number: pullNumber,
      });

      // Get status checks
      const { data: checks } = await this.octokit.checks.listForRef({
        owner,
        repo,
        ref: pr.head.sha,
      });

      return {
        mergeable: pr.mergeable || false,
        reviews,
        checks: checks.check_runs,
        state: pr.state,
      };
    } catch (error) {
      this.logger.error(`Error checking PR status:`, error);
      throw new Error(`Failed to check PR status: ${error.message}`);
    }
  }

  // Enhanced milestone creation
  async createMilestone(
    owner: string,
    repo: string,
    title: string,
    description: string,
    dueDate?: string,
  ): Promise<any> {
    try {
      if (!title || title.trim().length === 0) {
        throw new Error('Milestone title cannot be empty');
      }

      const { data } = await this.octokit.issues.createMilestone({
        owner,
        repo,
        title,
        description: description || '',
        due_on: dueDate,
      });

      this.logger.log(`Successfully created milestone: ${title}`);
      return data;
    } catch (error) {
      this.logger.error(`Error creating milestone:`, error);
      if (error.status === 422) {
        throw new Error(`Milestone validation failed: ${error.message}`);
      }
      throw new Error(`Failed to create milestone: ${error.message}`);
    }
  }

  // Enhanced issue assignment
  async assignIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    assignees: string[],
  ): Promise<any> {
    try {
      if (!assignees || assignees.length === 0) {
        throw new Error('At least one assignee is required');
      }

      // Validate assignees are collaborators
      const collaborators = await this.getCollaborators(owner, repo);
      const collaboratorLogins = collaborators.map(c => c.login);
      
      const invalidAssignees = assignees.filter(assignee => !collaboratorLogins.includes(assignee));
      if (invalidAssignees.length > 0) {
        throw new Error(`Invalid assignees: ${invalidAssignees.join(', ')}. They must be collaborators.`);
      }

      const { data } = await this.octokit.issues.addAssignees({
        owner,
        repo,
        issue_number: issueNumber,
        assignees,
      });

      this.logger.log(`Successfully assigned issue #${issueNumber} to ${assignees.join(', ')}`);
      return data;
    } catch (error) {
      this.logger.error(`Error assigning issue:`, error);
      throw new Error(`Failed to assign issue: ${error.message}`);
    }
  }

  // Get repository collaborators with error handling
  async getCollaborators(owner: string, repo: string): Promise<any[]> {
    try {
      const { data } = await this.octokit.repos.listCollaborators({
        owner,
        repo,
      });

      return data;
    } catch (error) {
      this.logger.error(`Error getting collaborators:`, error);
      if (error.status === 404) {
        throw new Error(`Repository ${owner}/${repo} not found`);
      }
      if (error.status === 403) {
        throw new Error(`Permission denied to access collaborators for ${owner}/${repo}`);
      }
      throw new Error(`Failed to get collaborators: ${error.message}`);
    }
  }

  // Enhanced label creation
  async createLabel(
    owner: string,
    repo: string,
    name: string,
    color: string,
    description: string,
  ): Promise<any> {
    try {
      if (!name || name.trim().length === 0) {
        throw new Error('Label name cannot be empty');
      }

      // Ensure color is in correct format (6 hex digits without #)
      const cleanColor = color.replace('#', '').toLowerCase();
      if (!/^[0-9a-f]{6}$/.test(cleanColor)) {
        throw new Error('Color must be a 6-digit hex code (e.g., "ff0000" or "#ff0000")');
      }

      const { data } = await this.octokit.issues.createLabel({
        owner,
        repo,
        name: name.trim(),
        color: cleanColor,
        description: description || '',
      });

      this.logger.log(`Successfully created label: ${name}`);
      return data;
    } catch (error) {
      this.logger.error(`Error creating label:`, error);
      if (error.status === 422) {
        throw new Error(`Label validation failed: ${error.message}`);
      }
      throw new Error(`Failed to create label: ${error.message}`);
    }
  }

  // Utility method to check if a branch has commits
  async hasBranchCommits(
    owner: string,
    repo: string,
    branchName: string,
    baseBranch: string = 'main',
  ): Promise<boolean> {
    try {
      const comparison = await this.octokit.repos.compareCommits({
        owner,
        repo,
        base: baseBranch,
        head: branchName,
      });

      return comparison.data.total_commits > 0;
    } catch (error) {
      this.logger.error(`Error checking branch commits:`, error);
      return false;
    }
  }

  // Utility method to ensure branch exists before operations
  async ensureBranch(
    owner: string,
    repo: string,
    branchName: string,
    baseBranch: string = 'main',
  ): Promise<boolean> {
    try {
      await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
      });
      return true;
    } catch (error) {
      if (error.status === 404) {
        try {
          await this.createBranch(owner, repo, branchName, baseBranch);
          return true;
        } catch (createError) {
          this.logger.error(`Failed to create branch ${branchName}:`, createError);
          return false;
        }
      }
      return false;
    }
  }
}