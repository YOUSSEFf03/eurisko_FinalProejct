export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  BUY = 'buy',
  SELL = 'sell',
  ADJUSTMENT = 'adjustment',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

export enum CmsRole {
  ADMINISTRATOR = 'administrator',
  ANALYST = 'analyst',
  SUPPORT_AGENT = 'support_agent',
}

export const KAFKA_CLIENT = 'KAFKA_CLIENT';

export const REDIS_KEYS = {
  walletLock: (userId: string) => `lock:wallet:${userId}`,
  walletCache: (userId: string) => `cache:wallet:${userId}`,
} as const;

export const WITHDRAWAL_HOLD_HRS = 48;
export const MIN_DEPOSIT_AMOUNT = 10;
export const MAX_DEPOSIT_AMOUNT = 100_000;
