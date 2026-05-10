import { Types } from 'mongoose';
import { CmsRole, UserStatus, KycStatus } from '../constants/index';

// ─── JWT ──────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  email: string;
  type: 'member';
  iat?: number;
  exp?: number;
}

export interface CmsJwtPayload {
  sub: string;
  email: string;
  role: CmsRole;
  type: 'cms';
  iat?: number;
  exp?: number;
}

// ─── Tokens ───────────────────────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── Validation error detail ──────────────────────────────────────────────────

export interface ValidationErrorDetail {
  field: string;
  messages: string[];
}

// ─── API response envelope ────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  data?: T;
  message?: string;
  error?: string;
  errors?: ValidationErrorDetail[];
  path?: string;
  timestamp?: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

// ─── Authenticated request ────────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

// ─── Member profile (returned on login) ──────────────────────────────────────

export interface MemberProfile {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  walletBalance: number;
  status: UserStatus;
  kycStatus: KycStatus;
}
