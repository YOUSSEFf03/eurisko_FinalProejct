import { Module } from '@nestjs/common';
import { ProcessorService } from './processor.service';
import { EmailModule } from '../channels/email/email.module';
import { TemplateModule } from '../templates/template.module';
import { NotificationLogModule } from '../notification-log/notification-log.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { RetryModule } from '../retry/retry.module';
import { OtpConsumer } from '../consumers/otp.consumer';
import { WalletConsumer } from '../consumers/wallet.consumer';
import { TradeConsumer } from '../consumers/trade.consumer';
import { PriceAlertConsumer } from '../consumers/price-alert.consumer';
import { CmsConsumer } from '../consumers/cms.consumer';

@Module({
  imports: [
    EmailModule,
    TemplateModule,
    NotificationLogModule,
    IdempotencyModule,
    RetryModule,
  ],
  providers: [
    ProcessorService,
    OtpConsumer,
    WalletConsumer,
    TradeConsumer,
    PriceAlertConsumer,
    CmsConsumer,
  ],
})
export class ProcessorModule {}
