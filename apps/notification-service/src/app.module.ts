import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from './config/configuration';
import { ProcessorModule } from './processor/processor.module';
import { NotificationLogModule } from './notification-log/notification-log.module';
import { EmailModule } from './channels/email/email.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { RetryModule } from './retry/retry.module';
import { TemplateModule } from './templates/template.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        uri: cs.get<string>('mongodb.uri'),
      }),
    }),
    TemplateModule,
    EmailModule,
    IdempotencyModule,
    RetryModule,
    NotificationLogModule,
    ProcessorModule,
  ],
})
export class AppModule {}
