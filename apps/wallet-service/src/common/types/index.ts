import { Types } from 'mongoose';
import { TransactionType, TransactionStatus } from '../constants';

// ─── Request user ─────────────────────────────────────────────────────────────
// Gateway injects x-user-id / x-user-role / x-user-email headers.
// Re-export from decorator so the rest of the service imports from one place.
export type { RequestUser } from '../decorators/current-user.decorator';

// ─── API response envelope ────────────────────────────────────────────────────

export interface ValidationErrorDetail {
  field: string;
  messages: string[];
}

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

// ─── Wallet domain ────────────────────────────────────────────────────────────

export interface WalletDto {
  userId: string;
  balance: number;
  currency: string;
  lastDepositAt: Date | null;
}

export interface TransactionDto {
  _id: Types.ObjectId;
  userId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  balanceBefore: number;
  balanceAfter: number | null;
  currency: string;
  idempotencyKey: string;
  createdAt: Date;
  processedAt?: Date;
}
