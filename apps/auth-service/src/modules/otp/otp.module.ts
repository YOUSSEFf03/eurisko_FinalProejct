import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OtpService } from './otp.service';
import {
  OtpVerification,
  OtpVerificationSchema,
} from '../../database/schemas/otp-verification.schema';
import { KafkaClientModule } from '../messaging/kafka-client.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OtpVerification.name, schema: OtpVerificationSchema },
    ]),
    KafkaClientModule,
  ],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
