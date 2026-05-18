export enum OtpPurpose {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
}

export enum UserStatus {
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

export enum NotificationEvent {
  OTP_CREATED = 'otp.created',
}

export const MIN_MEMBER_AGE = 18;

export const KAFKA_CLIENT = 'KAFKA_CLIENT';

export enum CmsRole {
  ADMINISTRATOR = 'administrator',
  ANALYST = 'analyst',
  SUPPORT_AGENT = 'support_agent',
}
