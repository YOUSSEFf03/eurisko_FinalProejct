import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export type UserRole = 'member' | 'administrator' | 'analyst' | 'support_agent';

export interface JwtPayload {
  sub: string;
  email: string;
  role?: UserRole; // optional — auth-service may not include it
  type?: string; // auth-service may send type instead of role
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
    console.log('JWT PAYLOAD:', JSON.stringify(payload));
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Malformed token payload');
    }

    // Derive role from either role or type field
    // auth-service tokens have no role — treat them as member
    const role: UserRole =
      payload.role ?? (payload.type as UserRole) ?? 'member';

    return {
      userId: payload.sub,
      email: payload.email,
      role,
    };
  }
}
