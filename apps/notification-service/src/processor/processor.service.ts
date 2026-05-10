import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../channels/email/email.service';
import { TemplateService } from '../templates/template.service';
import { NotificationLogService } from '../notification-log/notification.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { RetryService } from '../retry/retry.service';
import { NotificationType } from '@app/common';

interface ProcessOptions {
  userId: string;
  email: string;
  type: NotificationType;
  subject: string;
  templateName: string;
  templateContext: Record<string, unknown>;
  idempotencyKey: string;
}

@Injectable()
export class ProcessorService {
  private readonly logger = new Logger(ProcessorService.name);
  private readonly maxAttempts: number;

  constructor(
    private readonly emailService: EmailService,
    private readonly templateService: TemplateService,
    private readonly notificationLogService: NotificationLogService,
    private readonly idempotencyService: IdempotencyService,
    private readonly retryService: RetryService,
    private readonly configService: ConfigService,
  ) {
    this.maxAttempts = this.configService.get<number>('retry.maxAttempts') ?? 3;
  }

  async process(options: ProcessOptions): Promise<void> {
    const {
      userId,
      email,
      type,
      subject,
      templateName,
      templateContext,
      idempotencyKey,
    } = options;

    // 1. Idempotency check
    const isDuplicate =
      await this.idempotencyService.isDuplicate(idempotencyKey);

    if (isDuplicate) {
      this.logger.warn(`Duplicate notification skipped: ${idempotencyKey}`);
      return;
    }

    // 2. Create notification log
    const log = await this.notificationLogService.createPending(
      userId,
      email,
      type,
      'EMAIL',
      templateContext,
      idempotencyKey,
    );

    const logId = (log._id as string).toString();

    // 3. Render template
    const html = this.templateService.render(templateName, templateContext);

    // 4. Send with retry
    await this.retryService.executeWithRetry(
      async () => {
        await this.emailService.sendEmail(email, subject, html);
        await this.notificationLogService.markSent(logId);
        await this.idempotencyService.markProcessed(idempotencyKey);
        this.logger.log(`Notification sent [${type}] to ${email}`);
      },
      this.maxAttempts,
      async (attempt: number) => {
        await this.notificationLogService.markRetrying(logId, attempt);
      },
      async (errorMessage: string) => {
        await this.notificationLogService.markDead(logId, errorMessage);
      },
    );
  }
}
