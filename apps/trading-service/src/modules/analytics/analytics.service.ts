// ─────────────────────────────────────────────────────────────────────────────
// FILE: apps/trading-service/src/modules/analytics/analytics.service.ts
// FULL REPLACEMENT — fixes AUM walletBalances (was hardcoded 0) and
// active members displayName (was missing).
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Connection, Types } from 'mongoose';
import axios from 'axios';
import {
  VolumeQueryDto,
  VolumeGranularity,
  TopStocksQueryDto,
  ActiveMembersQueryDto,
} from './dto/analytics.dto';

// ── Response types ────────────────────────────────────────────────────────────

export interface VolumeDataPoint {
  date: string;
  sharesTraded: number;
  totalValue: number;
}

export interface TopStockEntry {
  stockId: string;
  ticker: string;
  companyName: string;
  tradeCount: number;
  totalVolume: number;
}

export interface AumResult {
  walletBalances: number;
  positionValues: number;
  totalAum: number;
}

export interface ActiveMemberEntry {
  memberId: string;
  displayName: string;
  tradeCount: number;
}

export interface SectorAllocationEntry {
  sector: string;
  totalValue: number;
  percentage: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly walletServiceUrl: string;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly configService: ConfigService,
  ) {
    this.walletServiceUrl = this.configService.get<string>(
      'WALLET_SERVICE_URL',
      'http://wallet-service:3005',
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Trading Volume Over Time
  // ─────────────────────────────────────────────────────────────────────────

  async getTradingVolume(query: VolumeQueryDto): Promise<VolumeDataPoint[]> {
    const ordersColl = this.connection.collection('orders');

    const matchStage: Record<string, unknown> = {
      status: 'executed',
      executedAt: { $ne: null },
    };

    if (query.stock_id && Types.ObjectId.isValid(query.stock_id)) {
      matchStage['stockId'] = new Types.ObjectId(query.stock_id);
    }

    if (query.from || query.to) {
      const dateRange: Record<string, Date> = {};
      if (query.from) dateRange['$gte'] = new Date(query.from);
      if (query.to) dateRange['$lte'] = new Date(query.to);
      matchStage['executedAt'] = dateRange;
    }

    const dateFormat =
      query.granularity === VolumeGranularity.MONTH ? '%Y-%m' : '%Y-%m-%d';

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: dateFormat, date: '$executedAt' },
          },
          sharesTraded: { $sum: '$shares' },
          totalValue: {
            $sum: { $toDouble: { $toString: '$totalAmount' } },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          sharesTraded: 1,
          totalValue: { $round: ['$totalValue', 2] },
        },
      },
    ];

    return (await ordersColl
      .aggregate(pipeline)
      .toArray()) as VolumeDataPoint[];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Top Traded Stocks
  // ─────────────────────────────────────────────────────────────────────────

  async getTopStocks(
    query: TopStocksQueryDto,
  ): Promise<{ data: TopStockEntry[]; total: number }> {
    const ordersColl = this.connection.collection('orders');
    const limit = query.limit ?? 5;
    const page = query.page ?? 1;
    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: { status: 'executed' } },
      {
        $group: {
          _id: '$stockId',
          ticker: { $first: '$ticker' },
          companyName: { $first: '$companyName' },
          tradeCount: { $sum: 1 },
          totalVolume: { $sum: '$shares' },
        },
      },
      { $sort: { tradeCount: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                stockId: { $toString: '$_id' },
                ticker: 1,
                companyName: 1,
                tradeCount: 1,
                totalVolume: 1,
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = (await ordersColl.aggregate(pipeline).toArray()) as [
      { data: TopStockEntry[]; total: { count: number }[] },
    ];

    return {
      data: result.data,
      total: result.total[0]?.count ?? 0,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Assets Under Management (AUM) — FIXED
  // Wallet balances fetched via HTTP from wallet-service internal endpoint.
  // Position values computed via MongoDB aggregation in trading-service DB.
  // ─────────────────────────────────────────────────────────────────────────

  async getAum(): Promise<AumResult> {
    const positionsColl = this.connection.collection('positions');

    // ── Position market value (aggregation in trading DB) ─────────────────
    const positionsPipeline = [
      { $match: { shares: { $gt: 0 } } },
      {
        $lookup: {
          from: 'stocks',
          localField: 'stockId',
          foreignField: '_id',
          as: 'stock',
        },
      },
      { $unwind: '$stock' },
      {
        $group: {
          _id: null,
          totalPositionValue: {
            $sum: {
              $multiply: [
                '$shares',
                { $toDouble: { $toString: '$stock.currentPrice' } },
              ],
            },
          },
        },
      },
    ];

    const [posResult] = (await positionsColl
      .aggregate(positionsPipeline)
      .toArray()) as [{ totalPositionValue: number } | undefined];

    const positionValues = parseFloat(
      (posResult?.totalPositionValue ?? 0).toFixed(2),
    );

    // ── Wallet balances (HTTP call to wallet-service internal endpoint) ────
    let walletBalances = 0;
    try {
      const resp = await axios.get<{ totalWalletBalance: number }>(
        `${this.walletServiceUrl}/internal/analytics/wallet-aum`,
        { timeout: 5_000 },
      );
      walletBalances = resp.data?.totalWalletBalance ?? 0;
    } catch (err) {
      // Non-fatal: log and return positions-only AUM
      this.logger.warn(
        `Could not fetch wallet balances for AUM: ${(err as Error).message}`,
      );
    }

    const totalAum = parseFloat((walletBalances + positionValues).toFixed(2));

    return { walletBalances, positionValues, totalAum };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Most Active Members — FIXED (now includes displayName)
  // ─────────────────────────────────────────────────────────────────────────

  async getActiveMembers(
    query: ActiveMembersQueryDto,
  ): Promise<ActiveMemberEntry[]> {
    const ordersColl = this.connection.collection('orders');
    const days = query.days ?? 30;
    const limit = query.limit ?? 10;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pipeline = [
      {
        $match: {
          status: 'executed',
          executedAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: '$memberId',
          tradeCount: { $sum: 1 },
        },
      },
      { $sort: { tradeCount: -1 } },
      { $limit: limit },
      // Join traders collection to get displayName
      {
        $lookup: {
          from: 'traders',
          localField: '_id',
          foreignField: '_id',
          as: 'trader',
        },
      },
      { $unwind: { path: '$trader', preserveNullAndEmpty: false } },
      {
        $project: {
          _id: 0,
          memberId: { $toString: '$_id' },
          displayName: '$trader.fullName',
          tradeCount: 1,
        },
      },
    ];

    return (await ordersColl
      .aggregate(pipeline)
      .toArray()) as ActiveMemberEntry[];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Sector Allocation
  // ─────────────────────────────────────────────────────────────────────────

  async getSectorAllocation(): Promise<SectorAllocationEntry[]> {
    const positionsColl = this.connection.collection('positions');

    const pipeline = [
      { $match: { shares: { $gt: 0 } } },
      {
        $lookup: {
          from: 'stocks',
          localField: 'stockId',
          foreignField: '_id',
          as: 'stock',
        },
      },
      { $unwind: '$stock' },
      {
        $group: {
          _id: '$stock.sector',
          totalValue: {
            $sum: {
              $multiply: [
                '$shares',
                { $toDouble: { $toString: '$stock.currentPrice' } },
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          sectors: {
            $push: { sector: '$_id', totalValue: '$totalValue' },
          },
          grandTotal: { $sum: '$totalValue' },
        },
      },
      { $unwind: '$sectors' },
      {
        $project: {
          _id: 0,
          sector: '$sectors.sector',
          totalValue: { $round: ['$sectors.totalValue', 2] },
          percentage: {
            $round: [
              {
                $cond: [
                  { $gt: ['$grandTotal', 0] },
                  {
                    $multiply: [
                      { $divide: ['$sectors.totalValue', '$grandTotal'] },
                      100,
                    ],
                  },
                  0,
                ],
              },
              2,
            ],
          },
        },
      },
      { $sort: { totalValue: -1 } },
    ];

    return (await positionsColl
      .aggregate(pipeline)
      .toArray()) as SectorAllocationEntry[];
  }
}
