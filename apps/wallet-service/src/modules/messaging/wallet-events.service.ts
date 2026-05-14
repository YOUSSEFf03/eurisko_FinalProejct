import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { KAFKA_CLIENT } from '../../common/constants';

// Re-use the shared event shape from libs/common
export interface WalletCreditedPayload {
  userId: string;
  email: string;
  name: string;
  amount: number;
  newBalance: number;
  currency: string;
  transactionId: string;
}

export interface WalletWithdrawalRequestedPayload {
  userId: string;
  email: string;
  name: string;
  amount: number;
  currency: string;
  transactionId: string;
}

export interface WalletWithdrawalProcessedPayload {
  userId: string;
  email: string;
  name: string;
  amount: number;
  approved: boolean;
  rejectionReason?: string;
  currency: string;
  transactionId: string;
}

const TOPICS = {
  WALLET_CREDITED: 'notification.wallet.credited',
  WALLET_WITHDRAWAL_REQUESTED: 'notification.wallet.withdrawal.requested',
  WALLET_WITHDRAWAL_PROCESSED: 'notification.wallet.withdrawal.processed',
} as const;

@Injectable()
export class WalletEventsService {
  private readonly logger = new Logger(WalletEventsService.name);

  constructor(
    @Inject(KAFKA_CLIENT) private readonly kafkaClient: ClientProxy,
  ) {}

  emitWalletCredited(payload: WalletCreditedPayload): void {
    this.kafkaClient.emit(TOPICS.WALLET_CREDITED, payload);
    this.logger.log(
      `Event emitted: ${TOPICS.WALLET_CREDITED} | userId=${payload.userId}`,
    );
  }

  emitWithdrawalRequested(payload: WalletWithdrawalRequestedPayload): void {
    this.kafkaClient.emit(TOPICS.WALLET_WITHDRAWAL_REQUESTED, payload);
    this.logger.log(
      `Event emitted: ${TOPICS.WALLET_WITHDRAWAL_REQUESTED} | userId=${payload.userId}`,
    );
  }

  emitWithdrawalProcessed(payload: WalletWithdrawalProcessedPayload): void {
    this.kafkaClient.emit(TOPICS.WALLET_WITHDRAWAL_PROCESSED, payload);
    this.logger.log(
      `Event emitted: ${TOPICS.WALLET_WITHDRAWAL_PROCESSED} | userId=${payload.userId} | approved=${payload.approved}`,
    );
  }
}
