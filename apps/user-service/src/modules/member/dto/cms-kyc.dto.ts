import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { KycStatus } from '../../../database/schemas/member.schema';

export class CmsKycDto {
  @IsEnum([KycStatus.APPROVED, KycStatus.REJECTED])
  kycStatus: KycStatus.APPROVED | KycStatus.REJECTED;

  // Required only when rejecting — enforced at service level
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
