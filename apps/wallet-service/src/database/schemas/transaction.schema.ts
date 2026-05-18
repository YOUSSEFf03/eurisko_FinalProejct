import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import mongoose from 'mongoose';
import { TransactionType, TransactionStatus } from '../../common/constants';

export type TransactionDocument = HydratedDocument<Transaction>;

/**
 * Transaction — immutable audit record of every wallet movement.
 *
 * Design decisions:
 *  - Never mutate amounts or balances after creation (audit integrity).
 *  - idempotencyKey (unique index) prevents double-processing Stripe webhooks.
 *  - balanceBefore / balanceAfter give a complete picture per record.
 *  - Compound index { userId, createdAt } covers history queries with date filters.
 *  - Compound index { userId, type } covers "show only withdrawals" queries.
 *  - Sparse index on stripePaymentIntentId — only set for deposit transactions.
 */
@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: TransactionType, required: true })
  type: TransactionType;

  @Prop({
    type: String,
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Prop({
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    get: (v: mongoose.Types.Decimal128) => parseFloat(v.toString()),
  })
  amount: mongoose.Types.Decimal128;

  @Prop({
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    get: (v: mongoose.Types.Decimal128) => parseFloat(v.toString()),
  })
  balanceBefore: mongoose.Types.Decimal128;

  @Prop({
    type: mongoose.Schema.Types.Decimal128,
    default: null,
    get: (v: mongoose.Types.Decimal128 | null) =>
      v ? parseFloat(v.toString()) : null,
  })
  balanceAfter: mongoose.Types.Decimal128 | null;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  // ── Stripe fields (deposits only) ─────────────────────────────────────────
  @Prop({ type: String, sparse: true, index: true })
  stripePaymentIntentId?: string;

  @Prop({ type: String, sparse: true })
  stripeSessionId?: string;

  // ── Idempotency key — unique per event so Stripe retries are safe ─────────
  @Prop({ type: String, required: true, unique: true })
  idempotencyKey: string;

  // ── Withdrawal approval trail ─────────────────────────────────────────────
  @Prop({ type: String, default: null })
  processedByCmsUserId: string | null;

  @Prop({ type: String })
  rejectionReason?: string;

  // ── Manual adjustment audit (CMS support agents) ──────────────────────────
  @Prop({ type: String })
  adjustmentNote?: string;

  @Prop({ type: Date, default: null })
  processedAt: Date | null;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Decimal128 → plain number in JSON responses
TransactionSchema.set('toJSON', { getters: true, virtuals: false });
TransactionSchema.set('toObject', { getters: true, virtuals: false });

// ── Compound indexes ──────────────────────────────────────────────────────────
TransactionSchema.index({ userId: 1, createdAt: -1 }); // history + pagination
TransactionSchema.index({ userId: 1, type: 1 }); // filter by type
TransactionSchema.index({ userId: 1, status: 1 }); // CMS withdrawal queues
