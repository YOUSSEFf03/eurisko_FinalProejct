export interface WalletCreditedEvent {
  userId: string;
  email: string;
  name: string;
  amount: number;
  newBalance: number;
  currency: string;
  transactionId: string;
}
