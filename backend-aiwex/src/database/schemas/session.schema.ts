import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SessionDocument = Session & Document;

@Schema({ timestamps: true })
export class Session {
  @Prop({ required: true, unique: true })
  sessionId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  userAgent: string;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  expiresAt: Date;

  @Prop()
  lastActivityAt: Date;

  @Prop({ type: Object })
  deviceInfo?: {
    browser?: string;
    os?: string;
    device?: string;
  };
}

export const SessionSchema = SchemaFactory.createForClass(Session);