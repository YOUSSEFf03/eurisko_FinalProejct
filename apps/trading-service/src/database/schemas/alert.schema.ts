import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AlertDirection } from '../../common/constants';

export type PriceAlertDocument = HydratedDocument<PriceAlert>;

@Schema({ timestamps: true })
export class PriceAlert {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  stockId: Types.ObjectId;

  @Prop({ type: String, required: true })
  ticker: string;

  @Prop({ type: Types.Decimal128, required: true })
  targetPrice: Types.Decimal128;

  @Prop({ type: String, enum: AlertDirection, required: true })
  direction: AlertDirection;

  @Prop({ type: Boolean, default: false, index: true })
  triggered: boolean;

  @Prop({ type: String, required: true })
  memberEmail: string;

  @Prop({ type: String, required: true })
  memberName: string;
  createdAt: Date;
  updatedAt: Date;
}

export const PriceAlertSchema = SchemaFactory.createForClass(PriceAlert);

// ── Compound indexes ──────────────────────────────────────────────────────────
// Checked every time a price is updated — must be fast
PriceAlertSchema.index({ stockId: 1, triggered: 1, direction: 1 });
// List member's own alerts
PriceAlertSchema.index({ memberId: 1, triggered: 1 });
