import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '@app/common';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  email: string;

  @Prop({
    required: true,
    enum: [
      'OTP_SEND',
      'WALLET_CREDITED',
      'TRADE_EXECUTED',
      'PRICE_ALERT',
      'CMS_PROVISIONED',
    ],
  })
  type: NotificationType;

  @Prop({ required: true, enum: ['EMAIL', 'PUSH'], default: 'EMAIL' })
  channel: NotificationChannel;

  @Prop({
    required: true,
    enum: ['PENDING', 'SENT', 'FAILED', 'RETRYING', 'DEAD'],
    default: 'PENDING',
  })
  status: NotificationStatus;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ type: Object })
  payload: Record<string, unknown>;

  @Prop()
  idempotencyKey: string;

  @Prop()
  errorMessage?: string;

  @Prop()
  sentAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, type: 1 });
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ idempotencyKey: 1 }, { unique: true });
