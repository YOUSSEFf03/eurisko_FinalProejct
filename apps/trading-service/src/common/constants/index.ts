export enum OrderType {
  BUY = 'buy',
  SELL = 'sell',
}

export enum OrderStatus {
  PENDING = 'pending',
  EXECUTED = 'executed',
  REJECTED = 'rejected',
}

export enum AlertDirection {
  ABOVE = 'above',
  BELOW = 'below',
}

export enum TraderStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

export enum KycStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum CmsRole {
  ADMINISTRATOR = 'administrator',
  ANALYST = 'analyst',
  SUPPORT_AGENT = 'support_agent',
}

export const KAFKA_CLIENT = 'KAFKA_CLIENT';

export const KAFKA_TOPICS = {
  // Consumed
  MEMBER_REGISTERED: 'member.registered',
  MEMBER_SUSPENDED: 'member.suspended',
  MEMBER_ACTIVATED: 'member.activated',
  MEMBER_KYC_UPDATED: 'member.kyc.updated',

  // Published
  NOTIFICATION_TRADE_EXECUTED: 'notification.trade.executed',
  NOTIFICATION_PRICE_ALERT: 'notification.price.alert',
} as const;

export const REDIS_KEYS = {
  memberLock: (memberId: string) => `lock:trading:member:${memberId}`,
  stockCache: (stockId: string) => `cache:stock:${stockId}`,
  stockCatalogue: 'cache:stock:catalogue',
  portfolioCache: (memberId: string) => `cache:portfolio:${memberId}`,
} as const;

export const PRICE_HISTORY_MAX = 365;
