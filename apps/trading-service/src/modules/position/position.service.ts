import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  Position,
  PositionDocument,
} from '../../database/schemas/position.schema';
// import { Stock } from '../../database/schemas/stock.schema';
import { StockService } from '../stock/stock.service';
import { CacheService } from '../cache/cache.service';
import { REDIS_KEYS } from '../../common/constants';

export interface PortfolioPosition {
  stockId: string;
  ticker: string;
  companyName: string;
  shares: number;
  avgBuyPrice: number;
  totalInvested: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface PortfolioSummary {
  positions: PortfolioPosition[];
  totalInvested: number;
  totalCurrentValue: number;
  totalUnrealizedPnL: number;
}

@Injectable()
export class PositionService {
  private readonly logger = new Logger(PositionService.name);
  private readonly portfolioCacheTtl: number;

  constructor(
    @InjectModel(Position.name)
    private readonly positionModel: Model<PositionDocument>,
    private readonly stockService: StockService,
    private readonly cacheService: CacheService,
    private readonly cs: ConfigService,
  ) {
    this.portfolioCacheTtl = cs.get<number>('PORTFOLIO_CACHE_TTL', 60);
  }

  /**
   * Returns all positions for a member with calculated values.
   * Portfolio value always calculated on read — never stored.
   * Cached for portfolioCacheTtl seconds.
   */
  async getPortfolio(memberId: string): Promise<PortfolioSummary> {
    const cacheKey = REDIS_KEYS.portfolioCache(memberId);
    const cached = await this.cacheService.get<PortfolioSummary>(cacheKey);
    if (cached) return cached;

    const positions = await this.positionModel
      .find({ memberId: new Types.ObjectId(memberId) })
      .lean();

    // Fetch current prices for all held stocks in parallel
    const stocks = await Promise.all(
      positions.map((p) =>
        this.stockService
          .findById(p.stockId as Types.ObjectId)
          .catch(() => null),
      ),
    );

    const portfolioPositions: PortfolioPosition[] = positions.map((pos, i) => {
      const stock = stocks[i];
      const currentPrice = stock
        ? parseFloat(stock.currentPrice.toString())
        : 0;
      const avgBuyPrice = parseFloat(pos.avgBuyPrice.toString());
      const totalInvested = parseFloat(pos.totalInvested.toString());
      const currentValue = pos.shares * currentPrice;
      const unrealizedPnL = currentValue - totalInvested;
      const unrealizedPnLPercent =
        totalInvested > 0 ? (unrealizedPnL / totalInvested) * 100 : 0;

      return {
        stockId: (pos.stockId as Types.ObjectId).toString(),
        ticker: pos.ticker,
        companyName: pos.companyName,
        shares: pos.shares,
        avgBuyPrice,
        totalInvested,
        currentPrice,
        currentValue,
        unrealizedPnL,
        unrealizedPnLPercent: parseFloat(unrealizedPnLPercent.toFixed(2)),
      };
    });

    const totalInvested = portfolioPositions.reduce(
      (sum, p) => sum + p.totalInvested,
      0,
    );
    const totalCurrentValue = portfolioPositions.reduce(
      (sum, p) => sum + p.currentValue,
      0,
    );
    const totalUnrealizedPnL = totalCurrentValue - totalInvested;

    const summary: PortfolioSummary = {
      positions: portfolioPositions,
      totalInvested,
      totalCurrentValue,
      totalUnrealizedPnL,
    };

    await this.cacheService.set(cacheKey, summary, this.portfolioCacheTtl);
    return summary;
  }

  async getPosition(
    memberId: string,
    stockId: Types.ObjectId,
  ): Promise<PortfolioPosition> {
    const position = await this.positionModel
      .findOne({
        memberId: new Types.ObjectId(memberId),
        stockId,
      })
      .lean();

    if (!position) throw new NotFoundException('Position not found');

    const stock = await this.stockService.findById(stockId);
    const currentPrice = parseFloat(stock.currentPrice.toString());
    const avgBuyPrice = parseFloat(position.avgBuyPrice.toString());
    const totalInvested = parseFloat(position.totalInvested.toString());
    const currentValue = position.shares * currentPrice;
    const unrealizedPnL = currentValue - totalInvested;
    const unrealizedPnLPercent =
      totalInvested > 0 ? (unrealizedPnL / totalInvested) * 100 : 0;

    return {
      stockId: stockId.toString(),
      ticker: position.ticker,
      companyName: position.companyName,
      shares: position.shares,
      avgBuyPrice,
      totalInvested,
      currentPrice,
      currentValue,
      unrealizedPnL,
      unrealizedPnLPercent: parseFloat(unrealizedPnLPercent.toFixed(2)),
    };
  }
}
