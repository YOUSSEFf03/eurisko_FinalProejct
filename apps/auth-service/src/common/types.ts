import { UserStatus } from './constants';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface MemberProfile {
  _id: unknown;
  fullName: string;
  email: string;
  walletBalance: number;
  status: UserStatus;
  kycStatus: string;
}
