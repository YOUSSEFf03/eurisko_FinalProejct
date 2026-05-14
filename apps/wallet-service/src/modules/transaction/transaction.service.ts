import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import mongoose from 'mongoose';
import {
  Transaction,
  TransactionDocument,
} from '../../database/schemas/transaction.schema';
import { TransactionType, TransactionStatus } from '../../common/constants';
import { PaginatedResult, PaginationMeta } from '../../common/types';

export interface CreateTransactionInput {
  userId: Types.ObjectId;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  balanceBefore: number;
  balanceAfter?: number;
  currency: string;
  idempotencyKey: string;
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  adjustmentNote?: string;
}

export interface TransactionHistoryQuery {
  userId: Types.ObjectId;
  type?: TransactionType;
  fromDate?: Date;
  toDate?: Date;
  page: number;
  limit: number;
}

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(input: CreateTransactionInput): Promise<TransactionDocument> {
    try {
      const doc = await this.transactionModel.create({
        userId: input.userId,
        type: input.type,
        status: input.status,
        amount: mongoose.Types.Decimal128.fromString(String(input.amount)),
        balanceBefore: mongoose.Types.Decimal128.fromString(
          String(input.balanceBefore),
        ),
        balanceAfter:
          input.balanceAfter !== undefined
            ? mongoose.Types.Decimal128.fromString(String(input.balanceAfter))
            : null,
        currency: input.currency,
        idempotencyKey: input.idempotencyKey,
        stripePaymentIntentId: input.stripePaymentIntentId,
        stripeSessionId: input.stripeSessionId,
        adjustmentNote: input.adjustmentNote,
      });

      this.logger.log(
        `Transaction created: ${doc._id} | type=${input.type} | userId=${input.userId}`,
      );

      return doc;
    } catch (err: unknown) {
      // Duplicate idempotency key — safe: Stripe webhook retry
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictException(
          `Transaction already processed: ${input.idempotencyKey}`,
        );
      }
      throw err;
    }
  }

  // ─── Mark completed (after atomic DB update succeeds) ─────────────────────

  async markCompleted(
    transactionId: Types.ObjectId,
    balanceAfter: number,
    processedByCmsUserId?: string,
  ): Promise<void> {
    await this.transactionModel.findByIdAndUpdate(transactionId, {
      $set: {
        status: TransactionStatus.COMPLETED,
        balanceAfter: mongoose.Types.Decimal128.fromString(
          String(balanceAfter),
        ),
        processedAt: new Date(),
        ...(processedByCmsUserId ? { processedByCmsUserId } : {}),
      },
    });
  }

  // ─── Mark rejected ────────────────────────────────────────────────────────

  async markRejected(
    transactionId: Types.ObjectId,
    reason: string,
    processedByCmsUserId?: string,
  ): Promise<void> {
    await this.transactionModel.findByIdAndUpdate(transactionId, {
      $set: {
        status: TransactionStatus.REJECTED,
        rejectionReason: reason,
        processedAt: new Date(),
        ...(processedByCmsUserId ? { processedByCmsUserId } : {}),
      },
    });
  }

  // ─── Idempotency check ────────────────────────────────────────────────────

  async existsByIdempotencyKey(key: string): Promise<boolean> {
    const count = await this.transactionModel.countDocuments({
      idempotencyKey: key,
    });
    return count > 0;
  }

  // ─── Find by ID ───────────────────────────────────────────────────────────

  async findById(
    transactionId: Types.ObjectId,
  ): Promise<TransactionDocument | null> {
    return this.transactionModel.findById(transactionId).exec();
  }

  // ─── History (paginated + filtered) ──────────────────────────────────────

  async findHistory(
    query: TransactionHistoryQuery,
  ): Promise<PaginatedResult<TransactionDocument>> {
    const filter: mongoose.FilterQuery<TransactionDocument> = {
      userId: query.userId,
    };

    if (query.type) filter['type'] = query.type;

    if (query.fromDate || query.toDate) {
      filter['createdAt'] = {};
      if (query.fromDate) filter['createdAt']['$gte'] = query.fromDate;
      if (query.toDate) filter['createdAt']['$lte'] = query.toDate;
    }

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean<TransactionDocument[]>()
        .exec(),
      this.transactionModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    const meta: PaginationMeta = {
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPrevPage: query.page > 1,
    };

    return { items, meta };
  }

  // ─── Pending withdrawals (CMS queue) ──────────────────────────────────────

  async findPendingWithdrawals(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<TransactionDocument>> {
    const filter = {
      type: TransactionType.WITHDRAWAL,
      status: TransactionStatus.PENDING,
    };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ createdAt: 1 }) // oldest first — FIFO queue
        .skip(skip)
        .limit(limit)
        .lean<TransactionDocument[]>()
        .exec(),
      this.transactionModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
