import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ActivityDocument = Activity & Document;

@Schema({ timestamps: true })
export class Activity {
  @Prop({ required: true, enum: [
    'user_login',
    'user_logout',
    'task_created',
    'task_updated',
    'task_completed',
    'pr_created',
    'pr_reviewed',
    'pr_merged',
    'issue_created',
    'issue_closed',
    'message_sent',
    'project_created',
    'level_up',
    'achievement_earned'
  ]})
  type: string;

  @Prop({ required: true })
  actorId: string; // User ID or Agent ID

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ type: String, ref: 'Agent' })
  agentId?: string;

  @Prop({ required: true })
  actorName: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Object, required: true })
  metadata: {
    projectId?: string;
    taskId?: string;
    prNumber?: number;
    issueNumber?: number;
    channelId?: string;
    oldValue?: any;
    newValue?: any;
    points?: number;
    level?: number;
    [key: string]: any;
  };

  @Prop()
  ipAddress?: string;

  @Prop({ default: false })
  isSystemGenerated: boolean;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);