export type NotificationChannel = 'EMAIL' | 'PUSH';

export type NotificationStatus =
  | 'PENDING'
  | 'SENT'
  | 'FAILED'
  | 'RETRYING'
  | 'DEAD';

export type NotificationType =
  | 'OTP_SEND'
  | 'WALLET_CREDITED'
  | 'TRADE_EXECUTED'
  | 'PRICE_ALERT'
  | 'CMS_PROVISIONED';

export interface BaseNotificationEvent {
  userId: string;
  email: string;
  name: string;
}
