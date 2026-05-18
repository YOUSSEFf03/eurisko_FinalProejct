import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { TradingModule } from './trading.module';

async function bootstrap() {
  const logger = new Logger('TradingService');

  const app = await NestFactory.create(TradingModule);

  // ── Kafka consumer ────────────────────────────────────────────────────────
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'trading-service-consumer',
        brokers: [process.env['KAFKA_BROKERS'] ?? 'kafka:9092'],
      },
      consumer: {
        groupId: 'trading-service-member-consumer',
      },
      subscribe: {
        fromBeginning: true,
      },
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api/v1');

  // ── Start both HTTP and Kafka ─────────────────────────────────────────────
  await app.startAllMicroservices();

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3006);

  await app.listen(port, '0.0.0.0');
  logger.log(`Trading Service running on port ${port}`);
}

bootstrap().catch((err: unknown) => {
  new Logger('Bootstrap').error('Fatal bootstrap error', err);
  process.exit(1);
});
