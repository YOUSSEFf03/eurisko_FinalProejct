import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TradingModule } from './trading.module';

async function bootstrap() {
  const logger = new Logger('TradingService');
  const app = await NestFactory.create(TradingModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3006);

  await app.listen(port);
  logger.log(`Trading Service running on port ${port}`);
}

bootstrap();
