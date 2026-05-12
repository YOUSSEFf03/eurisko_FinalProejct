import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'notification-service',
          brokers: ['kafka:9092'],
        },
        consumer: {
          groupId: 'notification-service-consumer',
        },
        subscribe: {
          fromBeginning: true,
        },
      },
    },
  );

  await app.listen();
}

bootstrap();
