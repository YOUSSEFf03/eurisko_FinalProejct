import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

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

/**
 * Reads JWT_SECRET directly from process.env.
 * ConfigService is NOT used here because passport strategies are
 * instantiated before the config module finishes loading,
 * causing "JwtStrategy requires a secret or key" at startup.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    const secret = process.env['JWT_SECRET'];
    if (!secret) throw new Error('JWT_SECRET env variable is not set');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

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
