import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { GatewayConfig } from '../../config/gateway.config';

export type UserRole = 'member' | 'admin' | 'analyst' | 'support_agent';

export interface JwtPayload {
  sub: string; // userId — matches auth-service TokenService
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly config: ConfigService<GatewayConfig>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt', { infer: true })?.secret ?? '',
    });
  }

  /**
   * Called after token signature is verified.
   * Returned value is set as req.user.
   */
  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Malformed token payload');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
