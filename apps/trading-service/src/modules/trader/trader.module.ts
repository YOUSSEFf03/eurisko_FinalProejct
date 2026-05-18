import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Trader, TraderSchema } from '../../database/schemas/trader.schema';
import { TraderService } from './trader.service';
import { MemberEventConsumer } from './member-event.consumer';
import { KAFKA_CLIENT } from '../../common/constants';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Trader.name, schema: TraderSchema }]),
    ClientsModule.registerAsync([
      {
        name: KAFKA_CLIENT,
        inject: [ConfigService],
        useFactory: (cs: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'trading-service-consumer',
              brokers: cs.get<string>('KAFKA_BROKERS', 'kafka:9092').split(','),
            },
            consumer: {
              groupId: 'trading-service-member-consumer',
            },
          },
        }),
      },
    ]),
  ],
  controllers: [MemberEventConsumer],
  providers: [TraderService, MemberEventConsumer],
  exports: [TraderService],
})
export class TraderModule {}
