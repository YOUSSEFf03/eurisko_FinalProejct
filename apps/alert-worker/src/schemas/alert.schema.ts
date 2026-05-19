import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AlertDocument = HydratedDocument<Alert>;

@Schema({ timestamps: true })
export class Alert {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  stockId: Types.ObjectId;

  @Prop({ type: String, required: true })
  ticker: string;

  @Prop({ type: Types.Decimal128, required: true })
  targetPrice: Types.Decimal128;

  @Prop({ type: String, enum: ['above', 'below'], required: true })
  direction: 'above' | 'below';

  @Prop({ type: Boolean, default: false, index: true })
  triggered: boolean;

  @Prop({ type: String, required: true })
  memberEmail: string;

  @Prop({ type: String, required: true })
  memberName: string;

  createdAt: Date;
  updatedAt: Date;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);

AlertSchema.index({ stockId: 1, triggered: 1 });
