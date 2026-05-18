import { IsString, IsNumber, IsPositive, IsNotEmpty } from 'class-validator';

export class InternalDeductDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  orderId: string;
}

export class InternalCreditDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  orderId: string;
}
