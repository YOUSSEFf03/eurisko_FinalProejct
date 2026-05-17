import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import mongoose from 'mongoose';
import { Wallet, WalletDocument } from '../../database/schemas/wallet.schema';
import { TransactionService } from '../transaction/transaction.service';
import { LockService } from '../lock/lock.service';
import { TransactionType, TransactionStatus } from '../../common/constants';

@Injectable()
export class InternalWalletService {
  private readonly logger = new Logger(InternalWalletService.name);

  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,
    private readonly transactionService: TransactionService,
    private readonly lockService: LockService,
  ) {}

  /**
   * Deduct funds for a buy order.
   * orderId is used as idempotency key — duplicate calls are safely ignored.
   */
  async deduct(
    userId: string,
    amount: number,
    orderId: string,
  ): Promise<{ newBalance: number }> {
    const idempotencyKey = `trade:deduct:${orderId}`;

    // Idempotency check — if already processed return current balance
    const already =
      await this.transactionService.existsByIdempotencyKey(idempotencyKey);
    if (already) {
      this.logger.log(`Duplicate deduct ignored: orderId=${orderId}`);
      const wallet = await this.walletModel
        .findOne({ userId: new Types.ObjectId(userId) })
        .lean<WalletDocument>();
      if (!wallet) throw new NotFoundException('Wallet not found');
      return { newBalance: parseFloat(wallet.balance.toString()) };
    }

    let newBalance = 0;

    await this.lockService.withLock(userId, async () => {
      // Check balance
      const wallet = await this.walletModel
        .findOne({ userId: new Types.ObjectId(userId) })
        .exec();

      if (!wallet) throw new NotFoundException('Wallet not found');

      const currentBalance = parseFloat(wallet.balance.toString());

      if (currentBalance < amount) {
        throw new BadRequestException(
          `Insufficient wallet balance. Available: ${currentBalance.toFixed(2)}, Required: ${amount.toFixed(2)}`,
        );
      }

      // Create PENDING transaction
      const transaction = await this.transactionService.create({
        userId: new Types.ObjectId(userId),
        type: TransactionType.BUY,
        status: TransactionStatus.PENDING,
        amount,
        balanceBefore: currentBalance,
        currency: wallet.currency ?? 'USD',
        idempotencyKey,
      });

      // Atomic conditional deduct — guard against race conditions
      const updated = await this.walletModel
        .findOneAndUpdate(
          {
            userId: new Types.ObjectId(userId),
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
        await this.transactionService.markRejected(
          transaction._id as Types.ObjectId,
          'Insufficient balance (concurrent race)',
          'system',
        );
        throw new BadRequestException('Insufficient wallet balance');
      }

      newBalance = parseFloat(updated.balance.toString());
      await this.transactionService.markCompleted(
        transaction._id as Types.ObjectId,
        newBalance,
      );

      this.logger.log(
        `Deduct | userId=${userId} | -${amount} | ${currentBalance} → ${newBalance} | orderId=${orderId}`,
      );
    });

    return { newBalance };
  }

  /**
   * Credit funds for a sell order or refund.
   * orderId is used as idempotency key.
   */
  async credit(
    userId: string,
    amount: number,
    orderId: string,
  ): Promise<{ newBalance: number }> {
    const idempotencyKey = `trade:credit:${orderId}`;

    const already =
      await this.transactionService.existsByIdempotencyKey(idempotencyKey);
    if (already) {
      this.logger.log(`Duplicate credit ignored: orderId=${orderId}`);
      const wallet = await this.walletModel
        .findOne({ userId: new Types.ObjectId(userId) })
        .lean<WalletDocument>();
      if (!wallet) throw new NotFoundException('Wallet not found');
      return { newBalance: parseFloat(wallet.balance.toString()) };
    }

    let newBalance = 0;

    await this.lockService.withLock(userId, async () => {
      const wallet = await this.walletModel
        .findOne({ userId: new Types.ObjectId(userId) })
        .exec();

      if (!wallet) throw new NotFoundException('Wallet not found');

      const currentBalance = parseFloat(wallet.balance.toString());

      const transaction = await this.transactionService.create({
        userId: new Types.ObjectId(userId),
        type: TransactionType.SELL,
        status: TransactionStatus.PENDING,
        amount,
        balanceBefore: currentBalance,
        currency: wallet.currency ?? 'USD',
        idempotencyKey,
      });

      const updated = await this.walletModel
        .findOneAndUpdate(
          { userId: new Types.ObjectId(userId) },
          {
            $inc: {
              balance: mongoose.Types.Decimal128.fromString(String(amount)),
            },
          },
          { new: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException('Wallet not found during credit');
      }

      newBalance = parseFloat(updated.balance.toString());
      await this.transactionService.markCompleted(
        transaction._id as Types.ObjectId,
        newBalance,
      );

      this.logger.log(
        `Credit | userId=${userId} | +${amount} | ${currentBalance} → ${newBalance} | orderId=${orderId}`,
      );
    });

    return { newBalance };
  }
}
