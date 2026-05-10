import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './notification.schema';
import { NotificationChannel, NotificationType } from '@app/common';

@Injectable()
export class NotificationLogService {
  private readonly logger = new Logger(NotificationLogService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async createPending(
    userId: string,
    email: string,
    type: NotificationType,
    channel: NotificationChannel,
    payload: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<NotificationDocument> {
    const notification = new this.notificationModel({
      userId,
      email,
      type,
      channel,
      payload,
      idempotencyKey,
      status: 'PENDING',
      attempts: 0,
    });
    return notification.save();
  }

  async markSent(id: string): Promise<void> {
    await this.notificationModel.findByIdAndUpdate(id, {
      status: 'SENT',
      sentAt: new Date(),
    });
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.notificationModel.findByIdAndUpdate(id, {
      status: 'FAILED',
      errorMessage,
    });
  }

  async markRetrying(id: string, attempts: number): Promise<void> {
    await this.notificationModel.findByIdAndUpdate(id, {
      status: 'RETRYING',
      attempts,
    });
  }

  async markDead(id: string, errorMessage: string): Promise<void> {
    await this.notificationModel.findByIdAndUpdate(id, {
      status: 'DEAD',
      errorMessage,
    });
    this.logger.error(`Notification ${id} moved to DLQ: ${errorMessage}`);
  }
}
