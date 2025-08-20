import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: ['planning', 'in-progress', 'review', 'completed'] })
  status: string;

  @Prop({ required: true })
  type: string; // 'static' | 'generated' | project type

  @Prop()
  repository?: string;

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ type: [String], default: [] })
  techStack: string[];

  @Prop()
  timeline: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  team: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop()
  deadline: Date;

  @Prop({ default: 0, min: 0, max: 100 })
  progress: number;

  @Prop({ type: Object })
  githubData?: {
    repoUrl?: string;
    issuesCount?: number;
    prsCount?: number;
    lastActivity?: Date;
  };

  @Prop({ type: Object })
  generationData?: {
    questions?: any[];
    answers?: any[];
    aiPrompt?: string;
  };

  @Prop()
  milestoneNumber?: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);