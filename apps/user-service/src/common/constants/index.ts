export enum MemberStatus {
  PENDING_VERIFICATION = 'pending_verification',
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

// Redis key factories — single source of truth for all cache keys
export const REDIS_KEYS = {
  memberProfile: (userId: string) => `cache:member:${userId}`,
} as const;

export const KAFKA_TOPICS = {
  // Consumed
  MEMBER_REGISTERED: 'member.registered',

  // Published
  MEMBER_SUSPENDED: 'member.suspended',
  MEMBER_ACTIVATED: 'member.activated',
  MEMBER_KYC_UPDATED: 'member.kyc.updated',
} as const;
