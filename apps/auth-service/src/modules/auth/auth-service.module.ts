import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth-service.controller';
import { AuthService } from './auth-service.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { TokenModule } from '../token/token.module';
import { OtpModule } from '../otp/otp.module';
import { KafkaClientModule } from '../messaging/kafka-client.module';
import { CmsAuthModule } from '../cms-auth/cms-auth.module';
import { SeedService } from '../../seed/seed.service';
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    TokenModule,
    OtpModule,
    KafkaClientModule, // ← required so AuthService can inject KAFKA_CLIENT
    CmsAuthModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, SeedService],
  exports: [AuthService],
})
export class AuthModule {}
