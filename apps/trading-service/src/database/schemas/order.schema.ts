import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { OrderType, OrderStatus } from '../../common/constants';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  stockId: Types.ObjectId;

  /** Denormalized — permanent record even if stock is deleted */
  @Prop({ type: String, required: true })
  ticker: string;

  @Prop({ type: String, required: true })
  companyName: string;

  @Prop({ type: String, enum: OrderType, required: true })
  type: OrderType;

  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.PENDING,
    index: true,
  })
  status: OrderStatus;

  @Prop({ type: Number, required: true, min: 1 })
  shares: number;

  @Prop({ type: Types.Decimal128, default: null })
  pricePerShare: Types.Decimal128 | null;

  @Prop({ type: Types.Decimal128, default: null })
  totalAmount: Types.Decimal128 | null;

  /** Sell orders only */
  @Prop({ type: Types.Decimal128, default: null })
  profitLoss: Types.Decimal128 | null;

  @Prop({ type: String, default: null })
  rejectionReason: string | null;

  @Prop({ type: Date, default: null })
  executedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// ── Compound indexes ──────────────────────────────────────────────────────────
OrderSchema.index({ memberId: 1, createdAt: -1 });  // order history queries
OrderSchema.index({ stockId: 1, executedAt: -1 });  // analytics queries
OrderSchema.index({ memberId: 1, status: 1 });      // pending orders lookup
