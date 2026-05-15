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
