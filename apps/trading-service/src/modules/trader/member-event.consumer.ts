import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Transport } from '@nestjs/microservices';
import { TraderService } from './trader.service';
import { KAFKA_TOPICS, TraderStatus, KycStatus } from '../../common/constants';

@Controller()
export class MemberEventConsumer {
  private readonly logger = new Logger(MemberEventConsumer.name);

  constructor(private readonly traderService: TraderService) {}

  @EventPattern(KAFKA_TOPICS.MEMBER_REGISTERED, Transport.KAFKA)
  async onMemberRegistered(
    @Payload() payload: { userId: string; fullName: string; email: string },
  ): Promise<void> {
    this.logger.log(`member.registered received: ${payload.email}`);
    await this.traderService.upsertFromRegistration({
      _id: payload.userId,
      fullName: payload.fullName,
      email: payload.email,
    });
  }

  @EventPattern(KAFKA_TOPICS.MEMBER_SUSPENDED, Transport.KAFKA)
  async onMemberSuspended(
    @Payload() payload: { memberId: string },
  ): Promise<void> {
    this.logger.log(`member.suspended received: ${payload.memberId}`);
    await this.traderService.updateStatus(
      payload.memberId,
      TraderStatus.SUSPENDED,
    );
  }

  @EventPattern(KAFKA_TOPICS.MEMBER_ACTIVATED, Transport.KAFKA)
  async onMemberActivated(
    @Payload() payload: { memberId: string },
  ): Promise<void> {
    this.logger.log(`member.activated received: ${payload.memberId}`);
    await this.traderService.updateStatus(
      payload.memberId,
      TraderStatus.ACTIVE,
    );
  }

  @EventPattern(KAFKA_TOPICS.MEMBER_KYC_UPDATED, Transport.KAFKA)
  async onKycUpdated(
    @Payload() payload: { memberId: string; kycStatus: string },
  ): Promise<void> {
    this.logger.log(`member.kyc.updated received: ${payload.memberId}`);
    await this.traderService.updateKycStatus(
      payload.memberId,
      payload.kycStatus as KycStatus,
    );
  }
}
