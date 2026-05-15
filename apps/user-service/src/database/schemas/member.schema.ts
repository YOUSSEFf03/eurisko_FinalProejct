import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MemberDocument = HydratedDocument<Member>;

export enum MemberStatus {
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

export enum KycStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * Member — user-service's source of truth for member profiles.
 *
 * Design decisions:
 *  - _id is intentionally the SAME ObjectId as the auth-service User document.
 *    We receive it via the `member.registered` Kafka event and store it here.
 *    This means no join or lookup is needed — one ID works across all services.
 *
 *  - status and kycStatus are kept in sync via Kafka events published by
 *    user-service and consumed by auth-service (and vice versa).
 *    The auth-service is the write-authority for status on login/suspend;
 *    user-service is the write-authority for kycStatus.
 *
 *  - suspensionReason is stored here for CMS audit trail display.
 */
@Schema({ timestamps: true })
export class Member {
  // Same ObjectId as auth-service User._id — shared identity across services
  @Prop({ type: Types.ObjectId, required: true })
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  fullName: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  nationalId: string;

  @Prop({ type: Date, required: true })
  dateOfBirth: Date;

  @Prop({
    type: String,
    enum: MemberStatus,
    default: MemberStatus.PENDING_VERIFICATION,
    index: true,
  })
  status: MemberStatus;

  @Prop({
    type: String,
    enum: KycStatus,
    default: KycStatus.PENDING,
    index: true,
  })
  kycStatus: KycStatus;

  @Prop({ type: String, default: null })
  suspensionReason: string | null;

  // Timestamps injected by { timestamps: true }
  createdAt: Date;
  updatedAt: Date;
}

export const MemberSchema = SchemaFactory.createForClass(Member);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Compound index for CMS list — most common filter combination
MemberSchema.index({ status: 1, createdAt: -1 });
MemberSchema.index({ kycStatus: 1, createdAt: -1 });
// Full-text search on name for CMS search
MemberSchema.index({ fullName: 'text', email: 'text' });
