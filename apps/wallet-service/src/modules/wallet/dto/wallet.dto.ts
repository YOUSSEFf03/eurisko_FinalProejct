import { IsNumber, IsPositive, IsString, Min, Max } from 'class-validator';

export class InitiateDepositDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(10)
  @Max(100000)
  amount: number;
}

export class WithdrawDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(1)
  amount: number;
}

export class RejectWithdrawalDto {
  @IsString()
  reason: string;
}
