import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { MessagingService } from './messaging.service';
import { KAFKA_CLIENT } from '../../common/constants';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: KAFKA_CLIENT,
        inject: [ConfigService],
        useFactory: (cs: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'trading-service',
              brokers: cs.get<string>('KAFKA_BROKERS', 'kafka:9092').split(','),
            },
            producer: {
              allowAutoTopicCreation: false,
            },
          },
        }),
      },
    ]),
  ],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
