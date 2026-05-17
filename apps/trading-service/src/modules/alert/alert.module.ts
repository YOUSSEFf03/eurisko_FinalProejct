import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PriceAlert,
  PriceAlertSchema,
} from '../../database/schemas/alert.schema';
import { Trader, TraderSchema } from '../../database/schemas/trader.schema';
import { Stock, StockSchema } from '../../database/schemas/stock.schema';
import { AlertController } from './alert.controller';
import { AlertService } from './alert.service';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PriceAlert.name, schema: PriceAlertSchema },
      { name: Trader.name, schema: TraderSchema },
      { name: Stock.name, schema: StockSchema },
    ]),
    MessagingModule,
  ],
  controllers: [AlertController],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}
