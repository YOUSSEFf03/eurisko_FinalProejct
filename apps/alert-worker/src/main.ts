import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { AlertWorkerModule } from './alert-worker.module';

async function bootstrap() {
  const logger = new Logger('AlertWorker');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AlertWorkerModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'alert-worker',
          brokers: [process.env['KAFKA_BROKERS'] ?? 'kafka:9092'],
        },
        consumer: {
          groupId: 'alert-worker-consumer',
        },
        subscribe: {
          fromBeginning: false,
        },
      },
    },
  );

  await app.listen();
  logger.log('Alert Worker is running — consuming stock.price.updated');
}

bootstrap().catch((err) => {
  new Logger('Bootstrap').error('Fatal error', err);
  process.exit(1);
});
