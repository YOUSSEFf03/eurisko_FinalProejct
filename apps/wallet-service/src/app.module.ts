import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '@nestjs-modules/ioredis';

import appConfig, { validationSchema, AppConfig } from './config/app.config';
import { WalletModule } from './modules/wallet/wallet.module';

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
        // Connection pool sizing for high-concurrency trading
        maxPoolSize: 20,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }),
    }),

    // ── Redis (lock + cache) ──────────────────────────────────────────────────
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService<AppConfig>) => ({
        type: 'single',
        options: {
          host: cs.get('redis.host', { infer: true }) ?? 'localhost',
          port: cs.get('redis.port', { infer: true }) ?? 6379,
          // Retry strategy — exponential back-off up to 5s
          retryStrategy: (times: number) => Math.min(times * 200, 5000),
          enableOfflineQueue: false, // Fail fast when Redis is down
          lazyConnect: false,
        },
      }),
    }),

    // ── Feature Modules ───────────────────────────────────────────────────────
    WalletModule,
  ],
})
export class AppModule {}
