import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import mongoose from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import { Wallet, WalletDocument } from '../../database/schemas/wallet.schema';
import { TransactionService } from '../transaction/transaction.service';
import { LockService } from '../lock/lock.service';
import { WalletEventsService } from '../messaging/wallet-events.service';
import { StripeService } from '../stripe/stripe.service';
import { TransactionType, TransactionStatus } from '../../common/constants';
import { AppConfig } from '../../config/app.config';
import { PaginatedResult } from '../../common/types';
import { TransactionDocument } from '../../database/schemas/transaction.schema';
import { TransactionHistoryQueryDto } from './dto/history-query.dto';

export interface StripeDepositInput {
  userId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
}

export interface MemberContext {
  userId: string;
  email: string;
  name: string;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,
    private readonly transactionService: TransactionService,
    private readonly lockService: LockService,
    private readonly walletEventsService: WalletEventsService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  // ─── Ensure wallet exists (created lazily on first access) ────────────────

  async ensureWallet(userId: string): Promise<WalletDocument> {
    const userObjectId = new Types.ObjectId(userId);

    const wallet = await this.walletModel
      .findOneAndUpdate(
        { userId: userObjectId },
        { $setOnInsert: { userId: userObjectId, balance: 0, currency: 'USD' } },
        { upsert: true, new: true },
      )
      .exec();

    return wallet!;
  }

  // ─── Get wallet ────────────────────────────────────────────────────────────

  async getWallet(userId: string): Promise<WalletDocument> {
    const wallet = await this.walletModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();

    if (!wallet) {
      throw new NotFoundException(
        'Wallet not found. Please make a deposit to create one.',
      );
    }

    return wallet;
  }

  // ─── Initiate deposit (creates Stripe Checkout Session) ───────────────────

  async initiateDeposit(
    member: MemberContext,
    amount: number,
  ): Promise<{ sessionId: string; checkoutUrl: string }> {
    const minDeposit =
      this.configService.get('wallet.minDeposit', { infer: true }) ?? 10;
    const maxDeposit =
      this.configService.get('wallet.maxDeposit', { infer: true }) ?? 100_000;

    if (amount < minDeposit || amount > maxDeposit) {
      throw new BadRequestException(
        `Deposit amount must be between $${minDeposit} and $${maxDeposit}`,
      );
    }

    // Idempotency key ties this specific deposit intent to the Stripe session
    const idempotencyKey = `deposit:${member.userId}:${randomUUID()}`;

    const result = await this.stripeService.createDepositSession(
      {
        userId: member.userId,
        amount,
        currency: 'USD',
        idempotencyKey,
      },
      'https://example.com/success',
      'https://example.com/cancel',
    );

    this.logger.log(
      `Deposit session created | userId=${member.userId} | amount=${amount}`,
    );

    return result;
  }

  /**
   * processStripeDeposit — called by the Stripe webhook controller.
   *
   * Flow:
   *  1. Idempotency check — if this webhook was already processed, 409 (safe retry)
   *  2. Acquire Redis lock on userId — only one deposit at a time per user
   *  3. Create a PENDING transaction record (audit: we know money is coming)
   *  4. Atomic MongoDB $inc — credit balance, update lastDepositAt
   *  5. Mark transaction COMPLETED with new balance
   *  6. Release lock
   *  7. Publish Kafka event → notification-service sends confirmation email
   */
  async processStripeDeposit(input: StripeDepositInput): Promise<void> {
    // Step 1 — Idempotency check (outside lock — cheap read)
    const alreadyProcessed =
      await this.transactionService.existsByIdempotencyKey(
        input.idempotencyKey,
      );

    if (alreadyProcessed) {
      this.logger.log(
        `Duplicate webhook ignored: idempotencyKey=${input.idempotencyKey}`,
      );
      return; // 200 to Stripe — already done
    }

    // Step 2 → 6 inside the lock
    await this.lockService.withLock(input.userId, async () => {
      const wallet = await this.ensureWallet(input.userId);
      const balanceBefore = parseFloat(wallet.balance.toString());

      // Step 3 — Create PENDING transaction (before touching balance)
      const transaction = await this.transactionService.create({
        userId: new Types.ObjectId(input.userId),
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PENDING,
        amount: input.amount,
        balanceBefore,
        currency: input.currency,
        idempotencyKey: input.idempotencyKey,
        stripePaymentIntentId: input.stripePaymentIntentId,
        stripeSessionId: input.stripeSessionId,
      });

      // Step 4 — Atomic credit: $inc never underflows, no read-modify-write race
      const updated = await this.walletModel
        .findOneAndUpdate(
          { userId: new Types.ObjectId(input.userId) },
          {
            $inc: {
              balance: mongoose.Types.Decimal128.fromString(
                String(input.amount),
              ),
            },
            $set: { lastDepositAt: new Date() },
          },
          { new: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException('Wallet not found during deposit credit');
      }

      const balanceAfter = parseFloat(updated.balance.toString());

      // Step 5 — Mark transaction completed with final balance
      await this.transactionService.markCompleted(
        transaction._id as Types.ObjectId,
        balanceAfter,
      );

      this.logger.log(
        `Deposit credited | userId=${input.userId} | +${input.amount} | balance: ${balanceBefore} → ${balanceAfter}`,
      );

      // Step 7 — Kafka event (after lock, fire-and-forget)
      // NOTE: We publish inside the lock callback so userId context is available
      // but the Kafka emit is non-blocking so it doesn't extend lock duration
      this.walletEventsService.emitWalletCredited({
        userId: input.userId,
        email: '', // populated by user-service lookup in notification-service
        name: '',
        amount: input.amount,
        newBalance: balanceAfter,
        currency: input.currency,
        transactionId: String(transaction._id),
      });
    });
  }

  /**
   * requestWithdrawal — member submits a withdrawal request.
   *
   * Business rules enforced:
   *  - 48-hour holding period since last deposit
   *  - Sufficient balance (soft check — final check at approval time)
   *
   * No money moves here. Transaction is created as PENDING.
   * CMS support agent must approve or reject via /cms/wallet/withdrawals.
   */
  async requestWithdrawal(
    member: MemberContext,
    amount: number,
  ): Promise<{ transactionId: string; message: string }> {
    const wallet = await this.getWallet(member.userId);
    const balance = parseFloat(wallet.balance.toString());

    // ── 48-hour holding period check ──────────────────────────────────────
    if (wallet.lastDepositAt) {
      const holdHrs =
        this.configService.get('wallet.withdrawalHoldHrs', { infer: true }) ??
        48;
      const holdMs = holdHrs * 60 * 60 * 1000;
      const elapsed = Date.now() - wallet.lastDepositAt.getTime();

      if (elapsed < holdMs) {
        const remainingMs = holdMs - elapsed;
        const remainingHrs = Math.ceil(remainingMs / (60 * 60 * 1000));
        throw new BadRequestException(
          `Withdrawals are locked for ${remainingHrs} more hour(s) after your last deposit.`,
        );
      }
    }

    // ── Sufficient balance check (soft) ──────────────────────────────────
    if (balance < amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: $${balance.toFixed(2)}, Requested: $${amount.toFixed(2)}`,
      );
    }

    // ── Create PENDING transaction — no lock needed (no balance change) ──
    const idempotencyKey = `withdrawal:${member.userId}:${randomUUID()}`;

    const transaction = await this.transactionService.create({
      userId: new Types.ObjectId(member.userId),
      type: TransactionType.WITHDRAWAL,
      status: TransactionStatus.PENDING,
      amount,
      balanceBefore: balance,
      currency: wallet.currency,
      idempotencyKey,
    });

    this.logger.log(
      `Withdrawal requested | userId=${member.userId} | amount=${amount} | txId=${transaction._id}`,
    );

    this.walletEventsService.emitWithdrawalRequested({
      userId: member.userId,
      email: member.email,
      name: member.name,
      amount,
      currency: wallet.currency,
      transactionId: String(transaction._id),
    });

    return {
      transactionId: String(transaction._id),
      message: 'Withdrawal request submitted. Pending CMS approval.',
    };
  }

  /**
   * approveWithdrawal — CMS support agent approves a pending withdrawal.
   *
   * Flow:
   *  1. Fetch and validate transaction (must be PENDING WITHDRAWAL)
   *  2. Acquire Redis lock on userId
   *  3. Re-check balance (balance may have changed since request was submitted)
   *  4. Atomic conditional debit: findOneAndUpdate with { balance >= amount }
   *     If condition fails, MongoDB returns null — we reject gracefully.
   *  5. Mark transaction COMPLETED
   *  6. Release lock
   *  7. Publish Kafka event
   */
  async approveWithdrawal(
    transactionId: Types.ObjectId,
    cmsUserId: string,
    member: MemberContext,
  ): Promise<void> {
    const transaction = await this.transactionService.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.type !== TransactionType.WITHDRAWAL) {
      throw new BadRequestException('Transaction is not a withdrawal');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new ConflictException(
        `Transaction is already ${transaction.status}`,
      );
    }

    const amount = parseFloat(transaction.amount.toString());

    await this.lockService.withLock(String(transaction.userId), async () => {
      // Re-check balance inside lock (state may have changed since request)
      const updated = await this.walletModel
        .findOneAndUpdate(
          {
            userId: transaction.userId,
            // Atomic guard: only debit if balance is still sufficient
            balance: {
              $gte: mongoose.Types.Decimal128.fromString(String(amount)),
            },
          },
          {
            $inc: {
              balance: mongoose.Types.Decimal128.fromString(String(-amount)),
            },
          },
          { new: true },
        )
        .exec();

      if (!updated) {
        // Balance insufficient at approval time — reject instead
        await this.transactionService.markRejected(
          transactionId,
          'Insufficient balance at time of approval',
          cmsUserId,
        );

        this.walletEventsService.emitWithdrawalProcessed({
          userId: member.userId,
          email: member.email,
          name: member.name,
          amount,
          approved: false,
          rejectionReason: 'Insufficient balance at time of approval',
          currency: transaction.currency,
          transactionId: String(transactionId),
        });

        throw new BadRequestException(
          'Insufficient balance. Withdrawal has been automatically rejected.',
        );
      }

      const balanceAfter = parseFloat(updated.balance.toString());

      await this.transactionService.markCompleted(
        transactionId,
        balanceAfter,
        cmsUserId,
      );

      this.logger.log(
        `Withdrawal approved | txId=${transactionId} | userId=${transaction.userId} | -${amount} | newBalance=${balanceAfter}`,
      );

      this.walletEventsService.emitWithdrawalProcessed({
        userId: member.userId,
        email: member.email,
        name: member.name,
        amount,
        approved: true,
        currency: transaction.currency,
        transactionId: String(transactionId),
      });
    });
  }

  /**
   * rejectWithdrawal — CMS support agent rejects a pending withdrawal.
   * No balance change. Transaction marked REJECTED.
   */
  async rejectWithdrawal(
    transactionId: Types.ObjectId,
    reason: string,
    cmsUserId: string,
    member: MemberContext,
  ): Promise<void> {
    const transaction = await this.transactionService.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.type !== TransactionType.WITHDRAWAL) {
      throw new BadRequestException('Transaction is not a withdrawal');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new ConflictException(
        `Transaction is already ${transaction.status}`,
      );
    }

    await this.transactionService.markRejected(
      transactionId,
      reason,
      cmsUserId,
    );

    const amount = parseFloat(transaction.amount.toString());

    this.walletEventsService.emitWithdrawalProcessed({
      userId: String(transaction.userId),
      email: member.email,
      name: member.name,
      amount,
      approved: false,
      rejectionReason: reason,
      currency: transaction.currency,
      transactionId: String(transactionId),
    });

    this.logger.log(
      `Withdrawal rejected | txId=${transactionId} | reason=${reason}`,
    );
  }

  // ─── Transaction history ──────────────────────────────────────────────────

  async getHistory(
    userId: string,
    query: TransactionHistoryQueryDto,
  ): Promise<PaginatedResult<TransactionDocument>> {
    return this.transactionService.findHistory({
      userId: new Types.ObjectId(userId),
      type: query.type,
      fromDate: query.from ? new Date(query.from) : undefined,
      toDate: query.to ? new Date(query.to) : undefined,
      page: query.page,
      limit: query.limit,
    });
  }

  // ─── CMS withdrawal queue ─────────────────────────────────────────────────

  async getPendingWithdrawals(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<TransactionDocument>> {
    return this.transactionService.findPendingWithdrawals(page, limit);
  }
}
