import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // Suppress NestJS boot logs; our LoggingInterceptor handles request logs
    logger: ['log', 'warn', 'error'],
  });

  // ── Global prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Global validation pipe ────────────────────────────────────────────────
  // whitelist:            strip unknown fields before they reach the controller
  // forbidNonWhitelisted: reject requests that contain unknown fields (400)
  // transform:            convert plain objects to DTO class instances
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false, // collect ALL validation errors at once
    }),
  );

  // ── Global exception filter ───────────────────────────────────────────────
  // Must be registered BEFORE interceptors so it catches their errors too.
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ── Global interceptors (applied in order) ────────────────────────────────
  // LoggingInterceptor:         logs every request/response
  // ResponseTransformInterceptor: wraps success payloads in { success, data }
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseTransformInterceptor(),
  );

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? '*',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`\n🚀  Auth service running at http://0.0.0.0:${port}/api/v1\n`);
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
