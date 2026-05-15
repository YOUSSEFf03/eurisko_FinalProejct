import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import {
  MemberStatus,
  KycStatus,
} from '../../../database/schemas/member.schema';

/**
 * MemberQueryDto — CMS list members with filters and pagination.
 */
export class MemberQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @IsOptional()
  @IsEnum(KycStatus)
  kycStatus?: KycStatus;

  // Free-text search against fullName and email (uses MongoDB text index)
  @IsOptional()
  @IsString()
  search?: string;
}
