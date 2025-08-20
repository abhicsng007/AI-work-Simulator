// src/database/schemas/message.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ 
  timestamps: true,
  collection: 'messages' 
})
export class Message {
  @Prop({ required: true })
  content: string;

  @Prop({ required: false })
  authorId: string;

  @Prop({ required: false })
  agentId: string;

  @Prop({ required: true })
  authorName: string;

  @Prop({ required: true })
  authorRole: string;

  @Prop({ required: true, index: true })
  channelId: string;

  @Prop({ type: Types.ObjectId, ref: 'Channel', required: false })
  channelObjectId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  mentions: string[];

  @Prop({ type: [Object], default: [] })
  attachments: Array<{
    filename: string;
    url: string;
    size: number;
    mimeType: string;
  }>;

  @Prop({ default: false })
  isEdited: boolean;

  @Prop({ type: Date })
  editedAt: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt: Date;

  @Prop({ type: Object })
  metadata: {
    taskId?: string;
    projectId?: string;
    prNumber?: number;
    codeSnippet?: {
      language: string;
      code: string;
    };
    replyTo?: string;
  };
}

export const MessageSchema = SchemaFactory.createForClass(Message);