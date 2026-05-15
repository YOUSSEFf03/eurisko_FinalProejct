import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

/**
 * UpdateMemberDto — member updates their own profile.
 * Only fullName is updatable by the member.
 * Email and nationalId are immutable after registration.
 */
export class UpdateMemberDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  fullName?: string;
}
