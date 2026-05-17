import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsInt,
  IsPositive,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PlaceOrderDto {
  @IsString()
  @IsNotEmpty()
  stockId: string;

  @IsInt()
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  shares: number;
}

export class OrderHistoryQueryDto {
  @IsString()
  @IsOptional()
  cursor?: string; // last order _id for cursor pagination

  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsString()
  @IsOptional()
  type?: 'buy' | 'sell';

  @IsString()
  @IsOptional()
  status?: 'pending' | 'executed' | 'rejected';
}
