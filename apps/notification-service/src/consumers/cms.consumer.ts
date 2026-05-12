import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS, CmsProvisionedEvent } from '@app/common';
import { ProcessorService } from '../processor/processor.service';

@Controller()
export class CmsConsumer {
  private readonly logger = new Logger(CmsConsumer.name);

  constructor(private readonly processorService: ProcessorService) {}

  @EventPattern(KAFKA_TOPICS.NOTIFICATION_CMS_PROVISIONED)
  async handle(@Payload() event: CmsProvisionedEvent): Promise<void> {
    this.logger.log(`CMS provisioned event received for user: ${event.userId}`);

    await this.processorService.process({
      userId: event.userId,
      email: event.email,
      type: 'CMS_PROVISIONED',
      subject: 'Your CMS Account Has Been Created',
      templateName: 'cms-provisioning',
      templateContext: {
        name: event.name,
        email: event.email,
        role: event.role,
        temporaryPassword: event.temporaryPassword,
      },
      idempotencyKey: `notification:CMS_PROVISIONED:${event.userId}:${event.email}`,
    });
  }
}
