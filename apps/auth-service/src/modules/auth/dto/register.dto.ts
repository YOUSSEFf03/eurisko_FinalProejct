import {
  IsEmail,
  IsString,
  IsDateString,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  fullName!: string;

  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'National ID is required' })
  @MinLength(5, { message: 'National ID must be at least 5 characters' })
  @MaxLength(20, { message: 'National ID must not exceed 20 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  nationalId!: string;

  /**
   * ISO-8601 date string — e.g. "1995-06-15"
   * Age validation (>= 18) is handled in AuthService, not here,
   * because it is a business rule not a format rule.
   */
  @IsDateString(
    {},
    { message: 'dateOfBirth must be a valid ISO-8601 date (YYYY-MM-DD)' },
  )
  dateOfBirth!: string;
}
