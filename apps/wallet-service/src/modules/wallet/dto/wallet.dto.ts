import {
  IsNumber,
  IsPositive,
  IsString,
  Min,
  Max,
  IsNotEmpty,
  MinLength,
} from 'class-validator';

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

export class ManualAdjustDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number; // positive = credit, negative = debit

  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Justification must be at least 10 characters' })
  justification: string;
}
