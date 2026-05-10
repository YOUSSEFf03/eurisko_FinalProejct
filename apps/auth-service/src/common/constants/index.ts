export enum OtpPurpose {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
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

export enum NotificationEvent {
  OTP_CREATED = 'notification.otp_created',
  WALLET_CREDITED = 'notification.wallet_credited',
  TRADE_CONFIRMED = 'notification.trade_confirmed',
  PRICE_ALERT_FIRED = 'notification.price_alert_fired',
  ACCOUNT_PROVISIONED = 'notification.account_provisioned',
}

export enum OrderType {
  BUY = 'buy',
  SELL = 'sell',
}

export enum OrderStatus {
  PENDING = 'pending',
  EXECUTED = 'executed',
  REJECTED = 'rejected',
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  BUY = 'buy',
  SELL = 'sell',
  ADJUSTMENT = 'adjustment',
}

export enum TransactionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export const KAFKA_CLIENT = 'KAFKA_CLIENT';
export const MIN_MEMBER_AGE = 18;
export const WITHDRAWAL_HOLD_HRS = 48;
export const OTP_LENGTH = 6;
