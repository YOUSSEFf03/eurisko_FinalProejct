import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum VolumeGranularity {
  DAY = 'day',
  MONTH = 'month',
}

export class VolumeQueryDto {
  @IsString()
  @IsOptional()
  stock_id?: string;

  @IsEnum(VolumeGranularity)
  @IsOptional()
  granularity?: VolumeGranularity = VolumeGranularity.DAY;

  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;
}

export class TopStocksQueryDto {
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 5;

  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;
}

export class ActiveMembersQueryDto {
  @IsNumber()
  @Min(1)
  @Max(365)
  @IsOptional()
  @Type(() => Number)
  days?: number = 30;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}
