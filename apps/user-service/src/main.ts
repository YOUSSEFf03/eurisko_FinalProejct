import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  // ── Kafka consumer ────────────────────────────────────────────────────────
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'user-service',
        brokers: [process.env['KAFKA_BROKERS'] ?? 'kafka:9092'],
      },
      consumer: {
        groupId: 'user-service-consumer',
      },
      subscribe: {
        fromBeginning: true, // ← picks up missed events on restart
      },
    },
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseTransformInterceptor(),
  );

  app.enableCors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? '*',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  app.enableShutdownHooks();

  // ── Start both HTTP and Kafka ─────────────────────────────────────────────
  await app.startAllMicroservices();

  const port = parseInt(process.env['PORT'] ?? '3002', 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`User service running at http://0.0.0.0:${port}/api/v1`);
}

bootstrap().catch((err: unknown) => {
  new Logger('Bootstrap').error('Fatal bootstrap error', err);
  process.exit(1);
});
