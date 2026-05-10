import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS, TradeExecutedEvent } from '@app/common';
import { ProcessorService } from '../processor/processor.service';

@Controller()
export class TradeConsumer {
  private readonly logger = new Logger(TradeConsumer.name);

  constructor(private readonly processorService: ProcessorService) {}

  @EventPattern(KAFKA_TOPICS.NOTIFICATION_TRADE_EXECUTED)
  async handle(@Payload() event: TradeExecutedEvent): Promise<void> {
    this.logger.log(`Trade executed event received for user: ${event.userId}`);

    await this.processorService.process({
      userId: event.userId,
      email: event.email,
      type: 'TRADE_EXECUTED',
      subject: `${event.tradeType} Order Executed — ${event.ticker}`,
      templateName: 'trade-confirmation',
      templateContext: {
        name: event.name,
        tradeType: event.tradeType,
        ticker: event.ticker,
        companyName: event.companyName,
        shares: event.shares,
        pricePerShare: event.pricePerShare,
        totalAmount: event.totalAmount,
        profitLoss: event.profitLoss,
        transactionId: event.transactionId,
      },
      idempotencyKey: `notification:TRADE_EXECUTED:${event.userId}:${event.transactionId}`,
    });
  }
}
