import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AlertConsumer } from './alert.consumer';
import { Alert, AlertSchema } from './schemas/alert.schema';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env['MONGODB_URI'] ??
        'mongodb://root:root@mongodb:27017/trading?authSource=admin',
    ),
    MongooseModule.forFeature([{ name: Alert.name, schema: AlertSchema }]),
    ClientsModule.register([
      {
        name: 'KAFKA_CLIENT',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'alert-worker-producer',
            brokers: [process.env['KAFKA_BROKERS'] ?? 'kafka:9092'],
          },
        },
      },
    ]),
  ],
  providers: [AlertConsumer],
})
export class AlertWorkerModule {}
