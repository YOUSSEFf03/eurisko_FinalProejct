import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { Member, MemberSchema } from '../../database/schemas/member.schema';
import { CacheModule } from '../cache/cache.module';
import { KafkaClientModule } from '../messaging/kafka-client.module';
import { MemberRegisteredConsumer } from '../messaging/member-registered.consumer';
import { CmsJwtAuthGuard } from '../../common/guards/cms-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Member.name, schema: MemberSchema }]),
    CacheModule,
    KafkaClientModule,
  ],
  controllers: [MemberController, MemberRegisteredConsumer], // ← consumer is a @Controller
  providers: [MemberService, CmsJwtAuthGuard, RolesGuard],
  exports: [MemberService],
})
export class MemberModule {}
