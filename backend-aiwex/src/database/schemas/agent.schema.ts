import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AgentDocument = Agent & Document;

@Schema({ timestamps: true })
export class Agent {
  @Prop({ required: true, unique: true })
  agentId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['developer', 'designer', 'qa', 'manager', 'analyst'] })
  role: string;

  @Prop({ required: true, enum: ['online', 'busy', 'offline'], default: 'online' })
  status: string;

  @Prop({ required: true })
  avatar: string;

  @Prop({ required: true })
  personality: string;

  @Prop({ type: [String], default: [] })
  skills: string[];

  @Prop({ default: 0 })
  tasksCompleted: number;

  @Prop({ default: 0 })
  tasksInProgress: number;

  @Prop({ default: 0 })
  totalInteractions: number;

  @Prop({ type: Object })
  configuration: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };

  @Prop()
  lastActiveAt?: Date;
}

export const AgentSchema = SchemaFactory.createForClass(Agent);