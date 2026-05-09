import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import appConfig, { validationSchema, AppConfig } from './config/app.config';
import { AuthModule } from './modules/auth/auth-service.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema,
      validationOptions: { abortEarly: false },
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService<AppConfig>) => ({
        uri: cs.get('mongodbUri', { infer: true }),
        maxPoolSize: 100,
        minPoolSize: 10,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
        heartbeatFrequencyMS: 10000,
        retryWrites: true,
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService<AppConfig>) => ({
        throttlers: [
          {
            ttl: (cs.get('throttle.ttl', { infer: true }) ?? 60) * 1000,
            limit: cs.get('throttle.limit', { infer: true }) ?? 10,
          },
        ],
      }),
    }),
    AuthModule,
  ],
})
export class AppModule {}
