import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { TraderStatus, KycStatus } from '../../common/constants';

export type TraderDocument = HydratedDocument<Trader>;

/**
 * Trader — local read-model of user-service Member.
 *
 * We keep this lightweight projection so trading-service can gate orders
 * without an HTTP round-trip to user-service on every trade.
 *
 * Kept in sync via Kafka events:
 *   member.registered   → create
 *   member.suspended    → status = suspended
 *   member.activated    → status = active
 *   member.kyc.updated  → kycStatus = new value
 */
@Schema({ timestamps: true })
export class Trader {
  /** Same ObjectId as user-service Member._id */
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

  @Prop({
    type: String,
    enum: TraderStatus,
    default: TraderStatus.ACTIVE,
    index: true,
  })
  status: TraderStatus;

  @Prop({
    type: String,
    enum: KycStatus,
    default: KycStatus.PENDING,
    index: true,
  })
  kycStatus: KycStatus;

  updatedAt: Date;
}

export const TraderSchema = SchemaFactory.createForClass(Trader);
