import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Member,
  MemberDocument,
  MemberStatus,
  KycStatus,
} from '../../database/schemas/member.schema';
import { KAFKA_TOPICS } from '../../common/constants';

export interface MemberRegisteredEvent {
  userId: string;
  fullName: string;
  email: string;
  nationalId: string;
  dateOfBirth: string;
}

/**
 * MemberRegisteredConsumer
 *
 * Listens to the `member.registered` Kafka event published by auth-service
 * at the end of the setPassword() flow (when the account goes ACTIVE).
 *
 * On receipt: creates the Member document in the users DB.
 *
 * Idempotency: MongoDB unique index on email + nationalId means duplicate
 * events produce a harmless conflict error, which we swallow gracefully.
 * The consumer group offset ensures at-least-once delivery.
 */
@Controller()
export class MemberRegisteredConsumer {
  private readonly logger = new Logger(MemberRegisteredConsumer.name);

  constructor(
    @InjectModel(Member.name)
    private readonly memberModel: Model<MemberDocument>,
  ) {}

  @EventPattern(KAFKA_TOPICS.MEMBER_REGISTERED)
  async handle(@Payload() event: MemberRegisteredEvent): Promise<void> {
    this.logger.log(`member.registered received | userId=${event.userId}`);

    try {
      await this.memberModel.create({
        _id: new Types.ObjectId(event.userId),
        fullName: event.fullName,
        email: event.email,
        nationalId: event.nationalId,
        dateOfBirth: new Date(event.dateOfBirth),
        status: MemberStatus.ACTIVE,
        kycStatus: KycStatus.PENDING,
        suspensionReason: null,
      });

      this.logger.log(`Member created | userId=${event.userId}`);
    } catch (err: unknown) {
      // MongoDB duplicate key (11000) — event was already processed
      // This is safe to swallow: the member already exists
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        this.logger.warn(
          `Duplicate member.registered ignored | userId=${event.userId}`,
        );
        return;
      }
      // Any other error: re-throw so Kafka retries the message
      this.logger.error(
        `Failed to create member | userId=${event.userId}`,
        err,
      );
      throw err;
    }
  }
}
