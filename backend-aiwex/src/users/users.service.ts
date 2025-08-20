import { Injectable, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { User, UserDocument } from '../database/schemas/user.schema';
import { Session, SessionDocument } from '../database/schemas/session.schema';
import { Activity, ActivityDocument } from '../database/schemas/activity.schema';
import { UserRole, rolePermissions, UserPermissions } from './entities/user.entity';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { Types } from 'mongoose';
@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    private websocketGateway: WebsocketGateway,
  ) {}

  async onModuleInit() {
    // Create demo users if they don't exist
    await this.createDemoUsers();
  }

  private async createDemoUsers() {
    const demoUsers = [
      {
        email: 'junior@company.com',
        name: 'Alex Junior',
        role: 'junior-developer' as UserRole,
        githubUsername: 'alexjunior',
        department: 'Engineering',
        level: 2,
        skills: ['JavaScript', 'React', 'Git'],
        stats: {
          tasksCompleted: 5,
          prsCreated: 8,
          prsReviewed: 0,
          issuesCreated: 12,
          points: 150,
        },
      },
      {
        email: 'senior@company.com',
        name: 'Sarah Senior',
        role: 'senior-developer' as UserRole,
        githubUsername: 'sarahsenior',
        department: 'Engineering',
        level: 7,
        skills: ['TypeScript', 'Node.js', 'AWS', 'System Design'],
        stats: {
          tasksCompleted: 156,
          prsCreated: 234,
          prsReviewed: 189,
          issuesCreated: 87,
          points: 4500,
        },
      },
      {
        email: 'qa@company.com',
        name: 'Emma QA',
        role: 'qa-engineer' as UserRole,
        githubUsername: 'emmaqa',
        department: 'Quality',
        level: 5,
        skills: ['Testing', 'Selenium', 'Jest', 'Cypress'],
        stats: {
          tasksCompleted: 89,
          prsCreated: 0,
          prsReviewed: 156,
          issuesCreated: 234,
          points: 2800,
        },
      },
      {
        email: 'pm@company.com',
        name: 'Mike PM',
        role: 'product-manager' as UserRole,
        githubUsername: 'mikepm',
        department: 'Product',
        level: 6,
        skills: ['Product Strategy', 'Agile', 'User Research', 'Analytics'],
        stats: {
          tasksCompleted: 45,
          prsCreated: 0,
          prsReviewed: 0,
          issuesCreated: 178,
          points: 3200,
        },
      },
    ];

    for (const userData of demoUsers) {
      const existingUser = await this.userModel.findOne({ email: userData.email });
      if (!existingUser) {
        await this.userModel.create(userData);
      }
    }
  }

  async createUser(userData: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel({
      ...userData,
      stats: {
        tasksCompleted: 0,
        prsCreated: 0,
        prsReviewed: 0,
        issuesCreated: 0,
        points: 0,
      },
    });
    return user.save();
  }

  async getUserById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId);
  }

  async getUserByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email });
  }

  async getAllUsers(): Promise<UserDocument[]> {
    return this.userModel.find({ isActive: true });
  }

  async getUsersByRole(role: UserRole): Promise<UserDocument[]> {
    return this.userModel.find({ role, isActive: true });
  }

  getUserPermissions(role: UserRole): UserPermissions {
    return rolePermissions[role];
  }

  async validatePermission(userId: string, permission: keyof UserPermissions): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const permissions = this.getUserPermissions(user.role);
    if (!permissions[permission]) {
      throw new ForbiddenException(`You don't have permission to ${permission}`);
    }
  }

  async updateUserStats(userId: string, statUpdate: Partial<User['stats']>): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) return;

    const oldStats = { ...user.stats };
    
    // Update stats
    Object.assign(user.stats, statUpdate);

    // Award points based on actions
    if (statUpdate.tasksCompleted && statUpdate.tasksCompleted > oldStats.tasksCompleted) {
      user.stats.points += 50 * (statUpdate.tasksCompleted - oldStats.tasksCompleted);
    }
    if (statUpdate.prsCreated && statUpdate.prsCreated > oldStats.prsCreated) {
      user.stats.points += 30 * (statUpdate.prsCreated - oldStats.prsCreated);
    }
    if (statUpdate.prsReviewed && statUpdate.prsReviewed > oldStats.prsReviewed) {
      user.stats.points += 20 * (statUpdate.prsReviewed - oldStats.prsReviewed);
    }

    // Check for level up
    const newLevel = Math.floor(user.stats.points / 500) + 1;
    if (newLevel > user.level) {
      user.level = newLevel;
      
      // Log activity
      await this.logActivity({
        type: 'level_up',
        actorId: userId,
        userId: user._id as Types.ObjectId,
        actorName: user.name,
        description: `${user.name} reached level ${newLevel}!`,
        metadata: {
          oldLevel: user.level,
          newLevel,
          points: user.stats.points,
        },
      });

      this.websocketGateway.sendLevelUp({
        userId,
        newLevel,
        userName: user.name,
      });
    }

    await user.save();
  }

  // Session management
  async createSession(userId: string, userAgent: string, ipAddress: string): Promise<string> {
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.sessionModel.create({
      sessionId,
      userId,
      userAgent,
      ipAddress,
      expiresAt,
      lastActivityAt: new Date(),
    });

    // Update user last login
    await this.userModel.findByIdAndUpdate(userId, { lastLogin: new Date() });

    // Log activity
    const user = await this.getUserById(userId);
    if (user) {
      await this.logActivity({
        type: 'user_login',
        actorId: userId,
        userId:user._id as Types.ObjectId,
        actorName: user.name,
        description: `${user.name} logged in`,
        metadata: { ipAddress },
      });
    }

    return sessionId;
  }

  async getUserBySession(sessionId: string): Promise<UserDocument | null> {
    const session = await this.sessionModel.findOne({ 
      sessionId, 
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
    
    if (!session) return null;

    // Update last activity
    session.lastActivityAt = new Date();
    await session.save();

    return this.userModel.findById(session.userId);
  }

  async invalidateSession(sessionId: string): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionId });
    if (session) {
      session.isActive = false;
      await session.save();

      // Log activity
      const user = await this.getUserById(session.userId.toString());
      if (user) {
        await this.logActivity({
          type: 'user_logout',
          actorId: user.id,
          userId:user._id as Types.ObjectId,
          actorName: user.name,
          description: `${user.name} logged out`,
          metadata: {},
        });
      }
    }
  }

  // Learning path recommendations
  async getLearningRecommendations(userId: string): Promise<any[]> {
    const user = await this.getUserById(userId);
    if (!user) return [];

    const recommendations = {
      'junior-developer': [
        { title: 'Code Review Best Practices', type: 'article' },
        { title: 'Git Workflow Mastery', type: 'course' },
        { title: 'Writing Clean Code', type: 'book' },
      ],
      'qa-engineer': [
        { title: 'Advanced Testing Strategies', type: 'course' },
        { title: 'Automation Framework Design', type: 'workshop' },
        { title: 'Performance Testing Guide', type: 'article' },
      ],
      'product-manager': [
        { title: 'Data-Driven Product Decisions', type: 'course' },
        { title: 'Stakeholder Communication', type: 'workshop' },
        { title: 'Agile Product Management', type: 'certification' },
      ],
    };

    return recommendations[user.role] || [];
  }

  // Mentorship matching
  async findMentor(userId: string): Promise<UserDocument | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;

    // Find senior person in same department
    const mentor = await this.userModel.findOne({
      department: user.department,
      level: { $gt: user.level + 2 },
      _id: { $ne: userId },
      isActive: true,
    }).sort({ level: -1 });

    if (mentor) {
      // Update user's mentor
      user.mentorId = mentor.id;
      await user.save();
    }

    return mentor;
  }

  // Activity logging
  private async logActivity(activityData: Partial<Activity>): Promise<void> {
    await this.activityModel.create({
      ...activityData,
      ipAddress: activityData.ipAddress || 'system',
    });
  }

  // Get user activities
  async getUserActivities(userId: string, limit: number = 50): Promise<ActivityDocument[]> {
    return this.activityModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  // Search users
  async searchUsers(query: string): Promise<UserDocument[]> {
    return this.userModel.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { githubUsername: { $regex: query, $options: 'i' } },
      ],
      isActive: true,
    }).limit(10);
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    );
  }
}