import { Controller, Logger, Inject } from '@nestjs/common';
import {
  EventPattern,
  Payload,
  Transport,
  ClientProxy,
} from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Alert, AlertDocument } from './schemas/alert.schema';

const BATCH_SIZE = 500;
const NOTIFICATION_CHUNK = 50;

interface PriceUpdatedEvent {
  stockId: string;
  ticker: string;
  newPrice: number;
}

@Controller()
export class AlertConsumer {
  private readonly logger = new Logger(AlertConsumer.name);

  constructor(
    @InjectModel(Alert.name)
    private readonly alertModel: Model<AlertDocument>,
    @Inject('KAFKA_CLIENT')
    private readonly kafkaClient: ClientProxy,
  ) {}

  @EventPattern('stock.price.updated', Transport.KAFKA)
  async onPriceUpdated(@Payload() event: PriceUpdatedEvent): Promise<void> {
    this.logger.log(
      `Processing alerts for ${event.ticker} @ $${event.newPrice}`,
    );

    let page = 0;
    let totalTriggered = 0;

    while (true) {
      // ── Load 500 alerts at a time — never loads all into memory ──────────
      const alerts = await this.alertModel
        .find({
          stockId: new Types.ObjectId(event.stockId),
          triggered: false,
        })
        .skip(page * BATCH_SIZE)
        .limit(BATCH_SIZE)
        .lean();

      if (alerts.length === 0) break;

      // ── Filter which ones should trigger ─────────────────────────────────
      const toTrigger = alerts.filter((alert) => {
        const target = parseFloat(alert.targetPrice.toString());
        return alert.direction === 'above'
          ? event.newPrice >= target
          : event.newPrice <= target;
      });

      if (toTrigger.length > 0) {
        // ── Bulk mark as triggered ──────────────────────────────────────────
        await this.alertModel.updateMany(
          { _id: { $in: toTrigger.map((a) => a._id) } },
          { $set: { triggered: true } },
        );

        // ── Emit notifications in chunks of 50 ────────────────────────────
        for (let i = 0; i < toTrigger.length; i += NOTIFICATION_CHUNK) {
          const chunk = toTrigger.slice(i, i + NOTIFICATION_CHUNK);

          await Promise.all(
            chunk.map((alert) =>
              this.kafkaClient
                .emit('notification.price.alert', {
                  userId: alert.memberId.toString(),
                  email: alert.memberEmail,
                  name: alert.memberName,
                  ticker: event.ticker,
                  targetPrice: parseFloat(alert.targetPrice.toString()),
                  currentPrice: event.newPrice,
                  direction: alert.direction,
                  alertId: alert._id.toString(),
                })
                .toPromise(),
            ),
          );

          totalTriggered += chunk.length;
        }
      }

      // ── If batch was smaller than BATCH_SIZE, we're done ─────────────────
      if (alerts.length < BATCH_SIZE) break;
      page++;
    }

    if (totalTriggered > 0) {
      this.logger.log(
        `Triggered ${totalTriggered} alerts for ${event.ticker} @ $${event.newPrice}`,
      );
    }
  }
}
