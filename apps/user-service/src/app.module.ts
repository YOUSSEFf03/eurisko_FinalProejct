import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '@nestjs-modules/ioredis';

import appConfig, { validationSchema, AppConfig } from './config/app.config';
import { MemberModule } from './modules/member/member.module';
import { KafkaClientModule } from './modules/messaging/kafka-client.module';

@Module({
  imports: [
    // ── Config ────────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema,
      validationOptions: { abortEarly: false },
    }),

    // ── MongoDB ───────────────────────────────────────────────────────────────
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService<AppConfig>) => ({
        uri: cs.get('mongodbUri', { infer: true }),
        maxPoolSize: 20,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }),
    }),

    // ── Redis ─────────────────────────────────────────────────────────────────
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService<AppConfig>) => ({
        type: 'single',
        options: {
          host: cs.get('redis.host', { infer: true }) ?? 'localhost',
          port: cs.get('redis.port', { infer: true }) ?? 6379,
          // Exponential back-off — max 5s between retries
          retryStrategy: (times: number) => Math.min(times * 200, 5000),
          // Fail fast when Redis is down — don't queue commands
          enableOfflineQueue: false,
          lazyConnect: false,
        },
      }),
    }),

    // ── Feature Modules ───────────────────────────────────────────────────────
    KafkaClientModule,
    MemberModule,
  ],
})
export class AppModule {}
