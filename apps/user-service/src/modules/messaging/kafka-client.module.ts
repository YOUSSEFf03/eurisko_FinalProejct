import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KAFKA_CLIENT } from '../../common/constants';
import { AppConfig } from '../../config/app.config';
import { MemberEventsService } from './member-events.service';

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
              clientId: 'user-service',
              brokers: cs.get('kafka.brokers', { infer: true }) ?? [
                'localhost:9092',
              ],
            },
            consumer: {
              groupId: 'user-service-consumer',
            },
            producer: {
              allowAutoTopicCreation: false,
            },
          },
        }),
      },
    ]),
  ],
  providers: [MemberEventsService],
  exports: [MemberEventsService, ClientsModule],
})
export class KafkaClientModule {}
