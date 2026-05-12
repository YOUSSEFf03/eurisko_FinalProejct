import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS, PriceAlertEvent } from '@app/common';
import { ProcessorService } from '../processor/processor.service';

@Controller()
export class PriceAlertConsumer {
  private readonly logger = new Logger(PriceAlertConsumer.name);

  constructor(private readonly processorService: ProcessorService) {}

  @EventPattern(KAFKA_TOPICS.NOTIFICATION_PRICE_ALERT)
  async handle(@Payload() event: PriceAlertEvent): Promise<void> {
    this.logger.log(`Price alert event received for user: ${event.userId}`);

    await this.processorService.process({
      userId: event.userId,
      email: event.email,
      type: 'PRICE_ALERT',
      subject: `Price Alert Triggered — ${event.ticker}`,
      templateName: 'price-alert',
      templateContext: {
        name: event.name,
        ticker: event.ticker,
        companyName: event.companyName,
        currentPrice: event.currentPrice,
        targetPrice: event.targetPrice,
        direction: event.direction,
      },
      idempotencyKey: `notification:PRICE_ALERT:${event.userId}:${event.ticker}:${event.targetPrice}`,
    });
  }
}
