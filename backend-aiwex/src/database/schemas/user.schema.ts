import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../../users/entities/user.entity';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['junior-developer', 'senior-developer', 'qa-engineer', 'product-manager', 'ui-ux-designer', 'team-lead', 'devops-engineer'] })
  role: UserRole;

  @Prop({ required: true })
  githubUsername: string;

  @Prop()
  avatar?: string;

  @Prop({ required: true })
  department: string;

  @Prop({ default: 1, min: 1, max: 10 })
  level: number;

  @Prop({ type: [String], default: [] })
  skills: string[];

  @Prop({ type: Object, default: {
    tasksCompleted: 0,
    prsCreated: 0,
    prsReviewed: 0,
    issuesCreated: 0,
    points: 0
  }})
  stats: {
    tasksCompleted: number;
    prsCreated: number;
    prsReviewed: number;
    issuesCreated: number;
    points: number;
  };

  @Prop()
  passwordHash?: string; // For future authentication

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLogin?: Date;

  @Prop()
  mentorId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);