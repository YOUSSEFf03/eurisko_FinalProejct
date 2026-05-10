export interface OtpEvent {
  userId: string;
  email: string;
  name: string;
  otp: string;
  expiresInMinutes: number;
}
