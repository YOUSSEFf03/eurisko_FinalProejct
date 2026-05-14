import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import mongoose from 'mongoose';

export type WalletDocument = HydratedDocument<Wallet>;

/**
 * Wallet — one document per member.
 *
 * Design decisions:
 *  - balance stored as Decimal128, not Number.
 *    JS IEEE-754 floats cannot represent 0.1 + 0.2 exactly.
 *    Financial systems require exact decimal arithmetic.
 *  - lastDepositAt is indexed separately for the 48-hr withdrawal hold check.
 *  - userId is a logical foreign key to the auth DB (cross-service).
 *    We don't use a DBRef because wallet-service owns its own MongoDB database.
 */
@Schema({ timestamps: true })
export class Wallet {
  @Prop({
    type: Types.ObjectId,
    required: true,
    unique: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    default: 0,
    get: (v: mongoose.Types.Decimal128) => parseFloat(v.toString()),
  })
  balance: mongoose.Types.Decimal128;

  @Prop({ type: String, default: 'USD', length: 3 })
  currency: string;

  @Prop({ type: Date, default: null, index: true })
  lastDepositAt: Date | null;

  // createdAt / updatedAt injected by { timestamps: true }
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);

// Enable virtual getters so Decimal128 is serialised as a plain number in JSON
WalletSchema.set('toJSON', { getters: true, virtuals: false });
WalletSchema.set('toObject', { getters: true, virtuals: false });
