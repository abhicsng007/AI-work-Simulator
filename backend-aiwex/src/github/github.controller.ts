import { Controller, Get, Post, Body, Param, Query, Headers } from '@nestjs/common';
import { GithubService } from './github.service';
import { GithubCollaborationService } from './github-collaboration.service';
import { UsersService } from '../users/users.service';

@Controller('github')
export class GithubController {
  constructor(
    private githubService: GithubService,
    private githubCollabService: GithubCollaborationService,
    private usersService: UsersService,
  ) {}

  // Repository Management
  @Post('repository')
  async createRepository(
    @Headers('x-session-id') sessionId: string,
    @Body() data: { name: string; description: string; private?: boolean }
  ) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }

    return this.githubService.createRepository(
      data.name,
      data.description
    );
  }

  @Get('repositories')
  async listRepositories(@Headers('x-session-id') sessionId: string) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }

    return this.githubService.listUserRepositories();
  }

  @Get('repository/:owner/:repo')
  async getRepository(
    @Param('owner') owner: string,
    @Param('repo') repo: string
  ) {
    return this.githubService.getRepository(owner, repo);
  }

  // Branch Management
  @Post('repository/:owner/:repo/branch')
  async createBranch(
    @Headers('x-session-id') sessionId: string,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() data: { branchName: string; baseBranch?: string }
  ) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }

    return this.githubCollabService.createBranch(
      owner,
      repo,
      data.branchName,
      data.baseBranch || 'main'
    );
  }

  // Pull Request Management
  @Post('repository/:owner/:repo/pull-request')
  async createPullRequest(
    @Headers('x-session-id') sessionId: string,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() data: {
      title: string;
      body: string;
      head: string;
      base?: string;
      assignees?: string[];
      labels?: string[];
    }
  ) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }

    return this.githubCollabService.createPullRequest(
      owner,
      repo,
      data.title,
      data.body,
      data.head,
      data.base || 'main',
      data.assignees,
      data.labels
    );
  }

  @Get('repository/:owner/:repo/pull-request/:number')
  async getPullRequestStatus(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('number') number: string
  ) {
    return this.githubCollabService.checkPullRequestStatus(
      owner,
      repo,
      parseInt(number)
    );
  }

  @Post('repository/:owner/:repo/pull-request/:number/review')
  async reviewPullRequest(
    @Headers('x-session-id') sessionId: string,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('number') number: string,
    @Body() data: {
      body: string;
      event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
      comments?: Array<{
        path: string;
        line: number;
        body: string;
      }>;
    }
  ) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }

    return this.githubCollabService.reviewPullRequest(
      owner,
      repo,
      parseInt(number),
      data
    );
  }

  @Post('repository/:owner/:repo/pull-request/:number/merge')
  async mergePullRequest(
    @Headers('x-session-id') sessionId: string,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('number') number: string,
    @Body() data: {
      commitTitle?: string;
      commitMessage?: string;
      mergeMethod?: 'merge' | 'squash' | 'rebase';
    }
  ) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }

    // Check permissions
    await this.usersService.validatePermission(user.id, 'canMergePR');

    return this.githubCollabService.mergePullRequest(
      owner,
      repo,
      parseInt(number),
      data.commitTitle,
      data.commitMessage,
      data.mergeMethod
    );
  }

  // Issue Management
  @Post('repository/:owner/:repo/issue')
  async createIssue(
    @Headers('x-session-id') sessionId: string,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() data: {
      title: string;
      body: string;
      assignees?: string[];
      labels?: string[];
      milestone?: number;
    }
  ) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }

    return this.githubCollabService.createIssue(
      owner,
      repo,
      data.title,
      data.body,
      data.assignees,
      data.labels,
      data.milestone
    );
  }

  @Post('repository/:owner/:repo/issue/:number/comment')
  async addIssueComment(
    @Headers('x-session-id') sessionId: string,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('number') number: string,
    @Body() data: { comment: string }
  ) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }

    return this.githubCollabService.addIssueComment(
      owner,
      repo,
      parseInt(number),
      data.comment
    );
  }

  @Post('repository/:owner/:repo/issue/:number/assign')
  async assignIssue(
    @Headers('x-session-id') sessionId: string,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('number') number: string,
    @Body() data: { assignees: string[] }
  ) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }

    return this.githubCollabService.assignIssue(
      owner,
      repo,
      parseInt(number),
      data.assignees
    );
  }

  // Project Management
  @Post('repository/:owner/:repo/project')
  async createProject(
    @Headers('x-session-id') sessionId: string,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() data: { name: string; body: string }
  ) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }

    return this.githubCollabService.createProject(
      owner,
      repo,
      data.name,
      data.body
    );
  }

  // Milestone Management
  @Post('repository/:owner/:repo/milestone')
  async createMilestone(
    @Headers('x-session-id') sessionId: string,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() data: {
      title: string;
      description: string;
      dueDate?: string;
    }
  ) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }

    return this.githubCollabService.createMilestone(
      owner,
      repo,
      data.title,
      data.description,
      data.dueDate
    );
  }

  // Label Management
  @Post('repository/:owner/:repo/label')
  async createLabel(
    @Headers('x-session-id') sessionId: string,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() data: {
      name: string;
      color: string;
      description: string;
    }
  ) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }

    return this.githubCollabService.createLabel(
      owner,
      repo,
      data.name,
      data.color,
      data.description
    );
  }

  // Collaborators
  @Get('repository/:owner/:repo/collaborators')
  async getCollaborators(
    @Param('owner') owner: string,
    @Param('repo') repo: string
  ) {
    return this.githubCollabService.getCollaborators(owner, repo);
  }
}