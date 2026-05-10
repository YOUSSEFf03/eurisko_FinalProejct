import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly mg: ReturnType<InstanceType<typeof Mailgun>['client']>;
  private readonly domain: string;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const mailgun = new Mailgun(FormData);
    this.mg = mailgun.client({
      username: 'api',
      key: this.configService.get<string>('mailgun.apiKey') ?? '',
    });
    this.domain = this.configService.get<string>('mailgun.domain') ?? '';
    this.from = this.configService.get<string>('mailgun.from') ?? '';
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    await this.mg.messages.create(this.domain, {
      from: this.from,
      to: [to],
      subject,
      html,
      text: text ?? '',
    });

    this.logger.log(`Email sent to ${to} — subject: "${subject}"`);
  }
}
