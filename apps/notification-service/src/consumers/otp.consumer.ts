import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS, OtpEvent } from '@app/common';
import { ProcessorService } from '../processor/processor.service';

@Controller()
export class OtpConsumer {
  private readonly logger = new Logger(OtpConsumer.name);

  constructor(private readonly processorService: ProcessorService) {}

  @EventPattern(KAFKA_TOPICS.NOTIFICATION_OTP_SEND)
  async handle(@Payload() event: OtpEvent): Promise<void> {
    this.logger.log(`OTP event received for user: ${event.userId}`);

    await this.processorService.process({
      userId: event.userId,
      email: event.email,
      type: 'OTP_SEND',
      subject: 'Your Verification Code',
      templateName: 'otp',
      templateContext: {
        name: event.name,
        otp: event.otp,
        expiresInMinutes: event.expiresInMinutes,
      },
      idempotencyKey: this.buildKey(event),
    });
  }

  private buildKey(event: OtpEvent): string {
    return `notification:OTP_SEND:${event.userId}:${event.otp}`;
  }
}
