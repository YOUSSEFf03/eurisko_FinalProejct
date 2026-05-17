import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as Joi from 'joi';
import { StockModule } from './modules/stock/stock.module';
import { OrderModule } from './modules/order/order.module';
import { PositionModule } from './modules/position/position.module';
import { AlertModule } from './modules/alert/alert.module';
import { TraderModule } from './modules/trader/trader.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RedisCacheModule } from './modules/cache/cache.module';
import { LockModule } from './modules/lock/lock.module';
import { MessagingModule } from './modules/messaging/messaging.module';

@Module({
  imports: [
    // ── Config ────────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3006),
        MONGODB_URI: Joi.string().required(),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().default(6379),
        KAFKA_BROKERS: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        WALLET_SERVICE_URL: Joi.string().required(),
        LOCK_TTL_MS: Joi.number().default(10000),
        STOCK_CACHE_TTL: Joi.number().default(30),
        PORTFOLIO_CACHE_TTL: Joi.number().default(60),
      }),
    }),

    // ── Database ──────────────────────────────────────────────────────────────
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        uri: cs.get<string>('MONGODB_URI'),
      }),
    }),

    // ── Infrastructure ────────────────────────────────────────────────────────
    RedisCacheModule,
    LockModule,
    MessagingModule,

    // ── Domain Modules ────────────────────────────────────────────────────────
    TraderModule,
    StockModule,
    OrderModule,
    PositionModule,
    AlertModule,
    AnalyticsModule,
  ],
})
export class TradingModule {}
