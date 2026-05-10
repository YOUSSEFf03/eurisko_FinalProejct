import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { AppConfig } from '../../config/app.config';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService<AppConfig>) => ({
        secret: cs.get('jwt.secret', { infer: true }),
        signOptions: {
          expiresIn: cs.get('jwt.accessExpiresIn', { infer: true }) ?? '15m',
        },
      }),
    }),
  ],
  providers: [TokenService],
  exports: [TokenService, JwtModule],
})
export class TokenModule {}
