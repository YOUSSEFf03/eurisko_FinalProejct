export type AlertDirection = 'above' | 'below';

export interface PriceAlertEvent {
  userId: string;
  email: string;
  name: string;
  ticker: string;
  companyName: string;
  targetPrice: number;
  currentPrice: number;
  direction: AlertDirection;
}
