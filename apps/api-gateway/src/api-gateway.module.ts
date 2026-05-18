import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import gatewayConfig, {
  GatewayConfig,
  validationSchema,
} from './config/gateway.config';

// Middleware
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';

// Guards
import { JwtStrategy } from './common/guards/jwt.strategy';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

// Interceptors
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

// Filter
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

// Health
import { HealthController } from './health/health.controller';

// Domain proxy modules
import { AuthProxyModule } from './modules/auth-proxy.module';
import { WalletProxyModule } from './modules/wallet-proxy.module';
import { UserProxyModule } from './modules/user-proxy.module';
import { TradingProxyModule } from './modules/trading-proxy.module';
import { CmsAuthProxyModule } from './modules/cms-auth-proxy.module';
@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [gatewayConfig],
      validationSchema,
      validationOptions: { abortEarly: false },
    }),

    // ── Auth ─────────────────────────────────────────────────────────────────
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService<GatewayConfig>) => {
        const jwt = cs.get('jwt', { infer: true });
        return {
          secret: jwt?.secret ?? '',
          signOptions: {
            expiresIn: (jwt?.expiresIn ??
              '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
          },
        };
      },
    }),

    // ── Rate Limiting ─────────────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService<GatewayConfig>) => {
        const t = cs.get('throttle', { infer: true });
        return {
          throttlers: [
            {
              name: 'default',
              ttl: (t?.ttl ?? 60) * 1000,
              limit: t?.limit ?? 100,
            },
            {
              name: 'auth',
              ttl: 60_000,
              limit: 10,
            },
          ],
        };
      },
    }),

    // ── Domain proxy modules ──────────────────────────────────────────────────
    AuthProxyModule,
    WalletProxyModule,
    UserProxyModule,
    TradingProxyModule,
    CmsAuthProxyModule,
  ],

  controllers: [HealthController],

  providers: [
    JwtStrategy,

    // 1. Filter first — wraps everything including interceptor errors
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },

    // 2. Guards: Throttler → JWT → Roles
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },

    // 3. Interceptors: Logging → Timeout → Transform
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class ApiGatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware, SecurityHeadersMiddleware, LoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
