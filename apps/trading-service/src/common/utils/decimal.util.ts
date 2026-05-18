import { Types } from 'mongoose';

/**
 * toFloat — safely converts a Decimal128 field to a JS number.
 *
 * Why this exists:
 *   Mongoose returns Decimal128 differently depending on how you query:
 *
 *   - findOne() / find()  (hydrated document)
 *       → value is a Decimal128 instance → .toString() works ✅
 *
 *   - findOne().lean() / find().lean()  (plain JS object)
 *       → value is a raw BSON object: { $numberDecimal: "182.63" }
 *       → .toString() returns "[object Object]" → parseFloat → NaN ❌
 *
 *   This util handles both cases, plus null/undefined gracefully.
 *
 * Usage:
 *   import { toFloat } from '../../common/utils/decimal.util';
 *
 *   toFloat(stock.currentPrice)   // Decimal128 or BSON object → number
 *   toFloat(pos.avgBuyPrice)
 *   toFloat(pos.totalInvested)
 */
export function toFloat(value: unknown): number {
  if (value == null) return 0;

  // Lean BSON object: { $numberDecimal: "182.63" }
  if (
    typeof value === 'object' &&
    '$numberDecimal' in (value as Record<string, unknown>)
  ) {
    const raw = (value as { $numberDecimal: string }).$numberDecimal;
    const parsed = parseFloat(raw);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Decimal128 instance (hydrated document) — has .toString()
  if (value instanceof Types.Decimal128) {
    const parsed = parseFloat(value.toString());
    return isNaN(parsed) ? 0 : parsed;
  }

  // Already a number (e.g. after a getter transform)
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  // Fallback: string or anything else with a .toString()
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * toDecimal128 — converts a number or string to a Mongoose Decimal128.
 * Use when writing Decimal128 fields to the database.
 *
 * Usage:
 *   toDecimal128(182.63)   → Types.Decimal128
 *   toDecimal128('182.63') → Types.Decimal128
 */
export function toDecimal128(value: number | string): Types.Decimal128 {
  return Types.Decimal128.fromString(String(value));
}
