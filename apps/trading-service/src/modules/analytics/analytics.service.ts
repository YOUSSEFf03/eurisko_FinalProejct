import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
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

  constructor(@InjectConnection() private readonly connection: Connection) {}

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Trading Volume Over Time
  // GET /analytics/volume?stock_id=&granularity=day|month&from=&to=
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

    // Date grouping format based on granularity
    const dateFormat =
      query.granularity === VolumeGranularity.MONTH ? '%Y-%m' : '%Y-%m-%d';

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat,
              date: '$executedAt',
            },
          },
          sharesTraded: { $sum: '$shares' },
          // totalAmount is stored as Decimal128 — convert via $toString then $toDouble
          totalValue: {
            $sum: {
              $toDouble: { $toString: '$totalAmount' },
            },
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

    const results = await ordersColl.aggregate(pipeline).toArray();
    return results as VolumeDataPoint[];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Top Traded Stocks
  // GET /analytics/stocks/top?limit=5&page=1
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
      {
        data: TopStockEntry[];
        total: { count: number }[];
      },
    ];

    return {
      data: result.data,
      total: result.total[0]?.count ?? 0,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Assets Under Management (AUM)
  // GET /analytics/aum
  // Wallet balances + current market value of all open positions
  // Both computed via DB aggregation — no in-memory iteration
  // ─────────────────────────────────────────────────────────────────────────

  async getAum(): Promise<AumResult> {
    // Wallet balances — from wallet DB
    // NOTE: wallet-service uses a separate MongoDB DB ("wallet").
    // Since we're in trading-service's DB ("trading"), we can only
    // aggregate positions here. Wallet AUM must be fetched via HTTP
    // from wallet-service's /internal/analytics/aum endpoint.
    // For the position values, we do a full aggregation pipeline.

    const positionsColl = this.connection.collection('positions');
    // const stocksColl = this.connection.collection('stocks');

    // Aggregate total market value of all open positions by joining stocks
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

    const positionValues = posResult?.totalPositionValue ?? 0;

    // Wallet balances are in a separate DB — we return position values
    // and let the api-gateway or a cross-service call populate wallet balances.
    // For a self-contained response we return what we have.
    // TODO: Aggregate wallet balances via cross-DB or HTTP call to wallet-service.
    return {
      walletBalances: 0, // populated by api-gateway combining wallet-service data
      positionValues: parseFloat(positionValues.toFixed(2)),
      totalAum: parseFloat(positionValues.toFixed(2)),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Most Active Members
  // GET /analytics/members/active?days=30&limit=10
  // ─────────────────────────────────────────────────────────────────────────

  async getActiveMembers(
    query: ActiveMembersQueryDto,
  ): Promise<ActiveMemberEntry[]> {
    const ordersColl = this.connection.collection('orders');
    // const tradersColl = this.connection.collection('traders');

    const days = query.days ?? 30;
    const limit = query.limit ?? 10;
    const since = new Date();
    since.setDate(since.getDate() - days);

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
      {
        $lookup: {
          from: 'traders',
          localField: '_id',
          foreignField: '_id',
          as: 'trader',
        },
      },
      { $unwind: { path: '$trader', preserveNullAndEmpty: true } },
      {
        $project: {
          _id: 0,
          memberId: { $toString: '$_id' },
          displayName: { $ifNull: ['$trader.fullName', 'Unknown'] },
          tradeCount: 1,
        },
      },
    ];

    const results = await ordersColl.aggregate(pipeline).toArray();
    return results as ActiveMemberEntry[];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Sector Allocation
  // GET /analytics/sectors
  // Only open position market values per sector (not wallet balances)
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
        // Self-join via $group to compute total for percentage calculation
        $group: {
          _id: null,
          sectors: {
            $push: {
              sector: '$_id',
              totalValue: '$totalValue',
            },
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

    const results = await positionsColl.aggregate(pipeline).toArray();
    return results as SectorAllocationEntry[];
  }
}
