import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { KAFKA_CLIENT, KAFKA_TOPICS } from '../../common/constants';
import { TradeExecutedEvent } from './events/trade-executed.event';
import { PriceAlertEvent } from './events/price-alert.event';

@Injectable()
export class MessagingService implements OnModuleInit {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    @Inject(KAFKA_CLIENT) private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.kafkaClient.connect();
  }

  emitTradeExecuted(event: TradeExecutedEvent): void {
    this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_TRADE_EXECUTED, event);
    this.logger.log(
      `TradeExecuted event emitted | userId=${event.userId} | ${event.tradeType} ${event.ticker}`,
    );
  }

  emitPriceAlert(event: PriceAlertEvent): void {
    this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_PRICE_ALERT, event);
    this.logger.log(
      `PriceAlert event emitted | userId=${event.userId} | ${event.ticker}`,
    );
  }
  emitPriceUpdated(payload: {
    stockId: string;
    ticker: string;
    newPrice: number;
  }): void {
    this.kafkaClient.emit('stock.price.updated', payload);
    this.logger.log(
      `stock.price.updated emitted | ticker=${payload.ticker} | price=${payload.newPrice}`,
    );
  }
}
