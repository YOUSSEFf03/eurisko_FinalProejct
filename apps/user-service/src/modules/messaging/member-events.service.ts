import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { KAFKA_CLIENT, KAFKA_TOPICS } from '../../common/constants';

export interface MemberSuspendedPayload {
  userId: string;
  reason: string | null;
}

export interface MemberActivatedPayload {
  userId: string;
}

export interface MemberKycUpdatedPayload {
  userId: string;
  kycStatus: string;
  rejectionReason?: string;
}

/**
 * MemberEventsService — publishes domain events from user-service to Kafka.
 *
 * All emits are fire-and-forget (non-blocking).
 * Consumers: auth-service (suspend/activate to sync User.status),
 *            wallet-service (suspend to block withdrawals — future).
 */
@Injectable()
export class MemberEventsService {
  private readonly logger = new Logger(MemberEventsService.name);

  constructor(
    @Inject(KAFKA_CLIENT) private readonly kafkaClient: ClientProxy,
  ) {}

  emitMemberSuspended(payload: MemberSuspendedPayload): void {
    this.kafkaClient.emit(KAFKA_TOPICS.MEMBER_SUSPENDED, payload);
    this.logger.log(
      `Event emitted: ${KAFKA_TOPICS.MEMBER_SUSPENDED} | userId=${payload.userId}`,
    );
  }

  emitMemberActivated(payload: MemberActivatedPayload): void {
    this.kafkaClient.emit(KAFKA_TOPICS.MEMBER_ACTIVATED, payload);
    this.logger.log(
      `Event emitted: ${KAFKA_TOPICS.MEMBER_ACTIVATED} | userId=${payload.userId}`,
    );
  }

  emitMemberKycUpdated(payload: MemberKycUpdatedPayload): void {
    this.kafkaClient.emit(KAFKA_TOPICS.MEMBER_KYC_UPDATED, payload);
    this.logger.log(
      `Event emitted: ${KAFKA_TOPICS.MEMBER_KYC_UPDATED} | userId=${payload.userId} | status=${payload.kycStatus}`,
    );
  }
}
