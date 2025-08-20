import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChannelDocument = Channel & Document;

@Schema({ timestamps: true })
export class Channel {
  @Prop({ required: true, unique: true })
  channelId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['general', 'development', 'design', 'testing', 'management', 'project'] })
  type: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  projectId?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  members: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  agentMembers: string[]; // Agent IDs

  @Prop({ default: false })
  isPrivate: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastActivity?: Date;

  @Prop({ type: Object })
  settings?: {
    slowMode?: number; // Seconds between messages
    autoArchive?: boolean;
    notificationSettings?: any;
  };
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);