import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PositionDocument = HydratedDocument<Position>;

@Schema({ timestamps: true })
export class Position {
  @Prop({ type: Types.ObjectId, required: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  stockId: Types.ObjectId;

  /** Denormalized for portfolio display without join */
  @Prop({ type: String, required: true })
  ticker: string;

  @Prop({ type: String, required: true })
  companyName: string;

  @Prop({ type: Number, required: true, min: 0 })
  shares: number;

  @Prop({ type: Types.Decimal128, required: true })
  avgBuyPrice: Types.Decimal128;

  @Prop({ type: Types.Decimal128, required: true })
  totalInvested: Types.Decimal128;

  createdAt: Date;
  updatedAt: Date;
}

export const PositionSchema = SchemaFactory.createForClass(Position);

// ── Indexes ───────────────────────────────────────────────────────────────────
PositionSchema.index({ memberId: 1, stockId: 1 }, { unique: true });
PositionSchema.index({ memberId: 1 }); // portfolio queries
