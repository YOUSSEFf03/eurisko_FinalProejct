import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CmsAuthController } from './cms-auth.controller';
import { CmsAuthService } from './cms-auth.service';
import {
  CmsUser,
  CmsUserSchema,
} from '../../database//schemas//cms-user.schema';
import { TokenModule } from '../token/token.module';
import { KafkaClientModule } from '../messaging/kafka-client.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CmsUser.name, schema: CmsUserSchema }]),
    TokenModule, // provides JwtService
    KafkaClientModule, // provides KAFKA_CLIENT
  ],
  controllers: [CmsAuthController],
  providers: [CmsAuthService],
  exports: [CmsAuthService],
})
export class CmsAuthModule {}
