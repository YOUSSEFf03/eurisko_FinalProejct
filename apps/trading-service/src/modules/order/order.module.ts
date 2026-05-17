import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../../database/schemas/order.schema';
import {
  Position,
  PositionSchema,
} from '../../database/schemas/position.schema';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { WalletClient } from './wallet.client';
import { StockModule } from '../stock/stock.module';
import { TraderModule } from '../trader/trader.module';
import { MessagingModule } from '../messaging/messaging.module';
import { LockModule } from '../lock/lock.module';
import { RedisCacheModule } from '../cache/cache.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Position.name, schema: PositionSchema },
    ]),
    RedisCacheModule,
    LockModule,
    StockModule,
    TraderModule,
    MessagingModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, WalletClient],
  exports: [OrderService],
})
export class OrderModule {}
