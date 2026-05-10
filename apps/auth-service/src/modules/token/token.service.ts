import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { JwtPayload, TokenPair } from '../../common/types';
import { hashPassword } from '../../utils/auth.util';

@Injectable()
export class TokenService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async issueTokenPair(user: UserDocument): Promise<TokenPair> {
    const payload: JwtPayload = { sub: String(user._id), email: user.email };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const hash = await hashPassword(refreshToken);
    await this.userModel.findByIdAndUpdate(user._id, {
      refreshTokenHash: hash,
    });

    return { accessToken, refreshToken };
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token);
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $unset: { refreshTokenHash: 1 },
    });
  }
}
