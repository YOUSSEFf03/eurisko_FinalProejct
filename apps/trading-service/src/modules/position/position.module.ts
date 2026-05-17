import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Position,
  PositionSchema,
} from '../../database/schemas/position.schema';
import { PositionController } from './position.controller';
import { PositionService } from './position.service';
import { StockModule } from '../stock/stock.module';
import { RedisCacheModule } from '../cache/cache.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Position.name, schema: PositionSchema },
    ]),
    RedisCacheModule,
    StockModule,
  ],
  controllers: [PositionController],
  providers: [PositionService],
  exports: [PositionService],
})
export class PositionModule {}
