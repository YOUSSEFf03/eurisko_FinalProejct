export type TradeType = 'BUY' | 'SELL';

export interface TradeExecutedEvent {
  userId: string;
  email: string;
  name: string;
  tradeType: TradeType;
  ticker: string;
  companyName: string;
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  profitLoss?: number;
  transactionId: string;
}
