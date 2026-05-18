import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

export interface NegativeBalanceMember {
  userId: string;
  balance: number;
  detectedAt: Date;
}

// In-memory store — refreshed nightly. CMS dashboard reads this.
// For multi-instance deployments, persist in Redis instead.
let negativeBalanceCache: NegativeBalanceMember[] = [];

@Injectable()
export class NegativeBalanceScheduler {
  private readonly logger = new Logger(NegativeBalanceScheduler.name);

  constructor(
    // Inject Wallet model
    @InjectModel('Wallet') private readonly walletModel: Model<any>,
  ) {}

  /**
   * Runs every night at midnight.
   * Scans all wallets for negative balances (data integrity issue).
   * Results cached in-memory and exposed via CMS dashboard endpoint.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkNegativeBalances(): Promise<void> {
    this.logger.log('Nightly negative balance scan started');

    try {
      const results = await this.walletModel.aggregate([
        {
          $match: {
            $expr: {
              $lt: [{ $toDouble: { $toString: '$balance' } }, 0],
            },
          },
        },
        {
          $project: {
            _id: 0,
            userId: { $toString: '$userId' },
            balance: { $toDouble: { $toString: '$balance' } },
          },
        },
      ]);

      negativeBalanceCache = results.map(
        (r: { userId: string; balance: number }) => ({
          userId: r.userId,
          balance: r.balance,
          detectedAt: new Date(),
        }),
      );

      this.logger.log(
        `Negative balance scan complete: ${negativeBalanceCache.length} member(s) flagged`,
      );
    } catch (err) {
      this.logger.error('Negative balance scan failed', err);
    }
  }

  // Called immediately on startup so the dashboard isn't empty
  async runNow(): Promise<void> {
    await this.checkNegativeBalances();
  }

  getNegativeBalances(): NegativeBalanceMember[] {
    return negativeBalanceCache;
  }
}
