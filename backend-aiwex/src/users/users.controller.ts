import { Controller, Get, Post, Body, Param, Headers } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserCollaborationService } from '../agents/collaboration/user-collaboration.service';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private userCollaborationService: UserCollaborationService,
  ) {}

  @Post('login')
  async login(@Body() data: { email: string }, @Headers() headers: any) {
    const user = await this.usersService.getUserByEmail(data.email);
    if (!user) {
      return { error: 'User not found' };
    }
    
    const userAgent = headers['user-agent'] || 'Unknown';
    const ipAddress = headers['x-forwarded-for'] || headers['x-real-ip'] || '127.0.0.1';
    
    const sessionId = await this.usersService.createSession(user.id, userAgent, ipAddress);
    return { user, sessionId };
  }

  @Get('profile')
  async getProfile(@Headers('x-session-id') sessionId: string) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }
    
    const permissions = this.usersService.getUserPermissions(user.role);
    const mentor = await this.usersService.findMentor(user.id);
    const learningPath = await this.usersService.getLearningRecommendations(user.id);
    
    return {
      user,
      permissions,
      mentor,
      learningPath,
    };
  }

  @Get('all')
  async getAllUsers() {
    return await this.usersService.getAllUsers();
  }

  @Get('role/:role')
  async getUsersByRole(@Param('role') role: string) {
    return await this.usersService.getUsersByRole(role as any);
  }

  @Post('task/create-feature')
  async createFeature(
    @Headers('x-session-id') sessionId: string,
    @Body() data: {
      title: string;
      description: string;
      repository: string;
      requestGuidance: boolean;
    }
  ) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }

    return this.userCollaborationService.userCreateFeature(user.id, data);
  }

  @Post('task/submit-pr')
  async submitPR(
    @Headers('x-session-id') sessionId: string,
    @Body() data: {
      repository: string;
      branch: string;
      title: string;
      description: string;
      issueNumber?: number;
    }
  ) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }

    return this.userCollaborationService.userSubmitPR(user.id, data);
  }

  @Post('task/review-pr')
  async reviewPR(
    @Headers('x-session-id') sessionId: string,
    @Body() data: {
      repository: string;
      pullNumber: number;
      comments: string;
      approval: 'approve' | 'request-changes' | 'comment';
    }
  ) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }

    return this.userCollaborationService.userReviewPR(user.id, data);
  }

  @Post('learning/exercise')
  async createLearningExercise(
    @Headers('x-session-id') sessionId: string,
    @Body() data: { skillLevel: 'easy' | 'medium' | 'hard' }
  ) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }

    return this.userCollaborationService.createLearningExercise(user.id, data.skillLevel);
  }

  @Get('tasks')
  async getUserTasks(@Headers('x-session-id') sessionId: string) {
    const user = await this.usersService.getUserBySession(sessionId);
    if (!user) {
      return { error: 'Invalid session' };
    }

    return this.userCollaborationService.getUserTasks(user.id);
  }
}