import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS, WalletCreditedEvent } from '@app/common';
import { ProcessorService } from '../processor/processor.service';

@Controller()
export class WalletConsumer {
  private readonly logger = new Logger(WalletConsumer.name);

  constructor(private readonly processorService: ProcessorService) {}

  @EventPattern(KAFKA_TOPICS.NOTIFICATION_WALLET_CREDITED)
  async handle(@Payload() event: WalletCreditedEvent): Promise<void> {
    this.logger.log(`Wallet credited event received for user: ${event.userId}`);

    await this.processorService.process({
      userId: event.userId,
      email: event.email,
      type: 'WALLET_CREDITED',
      subject: 'Wallet Credited Successfully',
      templateName: 'wallet-credit',
      templateContext: {
        name: event.name,
        amount: event.amount,
        newBalance: event.newBalance,
        currency: event.currency,
        transactionId: event.transactionId,
      },
      idempotencyKey: `notification:WALLET_CREDITED:${event.userId}:${event.transactionId}`,
    });
  }
}
