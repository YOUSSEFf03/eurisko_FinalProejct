import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StockDocument = HydratedDocument<Stock>;

@Schema({ _id: false })
export class PriceHistoryEntry {
  @Prop({ type: Types.Decimal128, required: true })
  price: Types.Decimal128;

  @Prop({ type: Date, required: true, index: true })
  recordedAt: Date;
}

export const PriceHistoryEntrySchema =
  SchemaFactory.createForClass(PriceHistoryEntry);

@Schema({ timestamps: true })
export class Stock {
  @Prop({
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  ticker: string;

  @Prop({ type: String, required: true, trim: true, index: true })
  companyName: string;

  @Prop({ type: String, required: true, index: true })
  sector: string;

  @Prop({ type: Types.Decimal128, required: true })
  currentPrice: Types.Decimal128;

  @Prop({ type: String, default: '' })
  description: string;

  @Prop({ type: Boolean, default: true, index: true })
  isListed: boolean;

  @Prop({ type: [PriceHistoryEntrySchema], default: [] })
  priceHistory: PriceHistoryEntry[];

  createdAt: Date;
  updatedAt: Date;
}

export const StockSchema = SchemaFactory.createForClass(Stock);

// ── Additional compound indexes ───────────────────────────────────────────────
StockSchema.index({ sector: 1, isListed: 1 });
StockSchema.index({ companyName: 'text' });
