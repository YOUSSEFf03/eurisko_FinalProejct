import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Stock, StockSchema } from '../../database/schemas/stock.schema';
import {
  PriceAlert,
  PriceAlertSchema,
} from '../../database/schemas/alert.schema';
import { Trader, TraderSchema } from '../../database/schemas/trader.schema';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { RedisCacheModule } from '../cache/cache.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Stock.name, schema: StockSchema },
      { name: PriceAlert.name, schema: PriceAlertSchema },
      { name: Trader.name, schema: TraderSchema },
    ]),
    RedisCacheModule,
    MessagingModule,
  ],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
