import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'notification-service',
        brokers: configService.get<string[]>('kafka.brokers') ?? ['kafka:9092'],
      },
      consumer: {
        groupId: 'notification-service-consumer',
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(configService.get<number>('port') ?? 3004);
}

bootstrap();
