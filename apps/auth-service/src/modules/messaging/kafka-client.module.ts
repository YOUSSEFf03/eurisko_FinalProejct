import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KAFKA_CLIENT } from '../../common/constants';
import { AppConfig } from '../../config/app.config';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: KAFKA_CLIENT,
        inject: [ConfigService],
        useFactory: (cs: ConfigService<AppConfig>) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'auth-service',
              brokers: cs.get('kafka.brokers', { infer: true }) ?? [
                'localhost:9092',
              ],
            },
            consumer: {
              groupId: 'auth-service-consumer',
            },
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class KafkaClientModule {}
