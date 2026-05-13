import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiGatewayModule } from './api-gateway.module';
import { GatewayConfig } from './config/gateway.config';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(ApiGatewayModule, {
    logger: ['log', 'warn', 'error'],
    // rawBody needed for Stripe webhook signature verification (wallet service)
    rawBody: true,
  });

  const config = app.get(ConfigService<GatewayConfig>);
  const port = config.get('port', { infer: true }) ?? 3000;
  const env = config.get('nodeEnv', { infer: true }) ?? 'development';

  // ── Global prefix ─────────────────────────────────────────────────────────
  // Excludes /health so Docker HEALTHCHECK works without the prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  // ── Validation ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  // ── CORS ──────────────────────────────────────────────────────────────────
  const origins = config.get('cors', { infer: true })?.origins ?? ['*'];
  app.enableCors({
    origin: origins.includes('*') ? '*' : origins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-request-id',
      'x-idempotency-key', // wallet deposits / withdrawals
    ],
    exposedHeaders: ['x-request-id'],
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  app.enableShutdownHooks();

  process.on('SIGTERM', async () => {
    logger.warn('SIGTERM — shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  await app.listen(port, '0.0.0.0');
  logger.log(`API Gateway running at http://0.0.0.0:${port}/api/v1  [${env}]`);
  logger.log(`Health check at http://0.0.0.0:${port}/health`);
}

bootstrap().catch((err: unknown) => {
  new Logger('Bootstrap').error('Fatal bootstrap error', err);
  process.exit(1);
});
