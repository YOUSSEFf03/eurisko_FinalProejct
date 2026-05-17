import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TraderService } from './trader.service';
import { KAFKA_TOPICS, TraderStatus, KycStatus } from '../../common/constants';

@Controller()
export class MemberEventConsumer {
  private readonly logger = new Logger(MemberEventConsumer.name);

  constructor(private readonly traderService: TraderService) {}

  @EventPattern(KAFKA_TOPICS.MEMBER_REGISTERED)
  async onMemberRegistered(
    @Payload() payload: { _id: string; fullName: string; email: string },
  ): Promise<void> {
    this.logger.log(`member.registered received: ${payload.email}`);
    await this.traderService.upsertFromRegistration(payload);
  }

  @EventPattern(KAFKA_TOPICS.MEMBER_SUSPENDED)
  async onMemberSuspended(
    @Payload() payload: { memberId: string },
  ): Promise<void> {
    this.logger.log(`member.suspended received: ${payload.memberId}`);
    await this.traderService.updateStatus(
      payload.memberId,
      TraderStatus.SUSPENDED,
    );
  }

  @EventPattern(KAFKA_TOPICS.MEMBER_ACTIVATED)
  async onMemberActivated(
    @Payload() payload: { memberId: string },
  ): Promise<void> {
    this.logger.log(`member.activated received: ${payload.memberId}`);
    await this.traderService.updateStatus(
      payload.memberId,
      TraderStatus.ACTIVE,
    );
  }

  @EventPattern(KAFKA_TOPICS.MEMBER_KYC_UPDATED)
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
