import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AlertDirection } from '../../../common/constants';

export class CreateAlertDto {
  @IsString()
  @IsNotEmpty()
  stockId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  targetPrice: number;

  @IsEnum(AlertDirection)
  direction: AlertDirection;
}
