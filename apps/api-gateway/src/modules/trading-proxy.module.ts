import { Module } from '@nestjs/common';
import {
  StocksProxyController,
  OrdersProxyController,
  PortfolioProxyController,
  AlertsProxyController,
  AnalyticsProxyController,
} from './trading-proxy.controller';
import { TradingProxyService } from './trading-proxy.service';

@Module({
  controllers: [
    StocksProxyController,
    OrdersProxyController,
    PortfolioProxyController,
    AlertsProxyController,
    AnalyticsProxyController,
  ],
  providers: [TradingProxyService],
})
export class TradingProxyModule {}
