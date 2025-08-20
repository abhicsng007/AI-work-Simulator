import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskDocument = Task & Document;

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: ['feature', 'bug', 'design', 'test', 'documentation'] })
  type: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @Prop()
  assignedTo: string; // Can be agent role or user ID

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedUserId?: Types.ObjectId;

  @Prop({ type: String, ref: 'Agent' })
  assignedAgentId?: string;

  @Prop({ required: true, enum: ['todo', 'in-progress', 'review', 'done'], default: 'todo' })
  status: string;

  @Prop({ required: true, enum: ['low', 'medium', 'high'] })
  priority: string;

  @Prop({ default: 1 })
  estimatedHours: number;

  @Prop({ default: 0 })
  actualHours: number;

  @Prop({ type: [String], default: [] })
  dependencies: string[];

  @Prop()
  githubIssueNumber?: number;

  @Prop()
  pullRequestNumber?: number;

  @Prop({ type: [String], default: [] })
  labels: string[];

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ type: Object })
  learningObjectives?: {
    objectives: string[];
    feedback?: string;
    score?: number;
  };

  @Prop({ type: [Object], default: [] })
  comments: Array<{
    author: string;
    content: string;
    createdAt: Date;
  }>;
}

export const TaskSchema = SchemaFactory.createForClass(Task);