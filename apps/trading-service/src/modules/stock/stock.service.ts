import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  Stock,
  StockDocument,
  PriceHistoryEntry,
} from '../../database/schemas/stock.schema';
import {
  PriceAlert,
  PriceAlertDocument,
} from '../../database/schemas/alert.schema';
import { Trader, TraderDocument } from '../../database/schemas/trader.schema';
import { CacheService } from '../cache/cache.service';
import { MessagingService } from '../messaging/messaging.service';
import { CreateStockDto, UpdateStockDto, StockQueryDto } from './dto/stock.dto';
import {
  REDIS_KEYS,
  PRICE_HISTORY_MAX,
  AlertDirection,
} from '../../common/constants';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);
  private readonly stockCacheTtl: number;
  private readonly catalogueCacheTtl: number;

  constructor(
    @InjectModel(Stock.name)
    private readonly stockModel: Model<StockDocument>,
    @InjectModel(PriceAlert.name)
    private readonly alertModel: Model<PriceAlertDocument>,
    @InjectModel(Trader.name)
    private readonly traderModel: Model<TraderDocument>,
    private readonly cacheService: CacheService,
    private readonly messagingService: MessagingService,
    private readonly cs: ConfigService,
  ) {
    this.stockCacheTtl = cs.get<number>('STOCK_CACHE_TTL', 30);
    this.catalogueCacheTtl = cs.get<number>('STOCK_CACHE_TTL', 60);
  }

  async create(dto: CreateStockDto): Promise<Stock> {
    const existing = await this.stockModel.findOne({
      ticker: dto.ticker.toUpperCase(),
    });
    if (existing)
      throw new ConflictException(
        `Stock with ticker "${dto.ticker}" already exists`,
      );

    const price = Types.Decimal128.fromString(String(dto.currentPrice));
    const stock = await this.stockModel.create({
      ticker: dto.ticker.toUpperCase(),
      companyName: dto.companyName,
      sector: dto.sector,
      currentPrice: price,
      description: dto.description ?? '',
      isListed: true,
      priceHistory: [{ price, recordedAt: new Date() }],
    });

    await this.cacheService.del(REDIS_KEYS.stockCatalogue);
    this.logger.log(`Stock created: ${stock.ticker}`);
    return stock;
  }

  async update(id: Types.ObjectId, dto: UpdateStockDto): Promise<Stock> {
    const updateFields: Record<string, unknown> = {};
    if (dto.companyName) updateFields['companyName'] = dto.companyName;
    if (dto.sector) updateFields['sector'] = dto.sector;
    if (dto.description !== undefined)
      updateFields['description'] = dto.description;

    let priceChanged = false;

    if (dto.currentPrice !== undefined) {
      priceChanged = true;
      const newPrice = Types.Decimal128.fromString(String(dto.currentPrice));
      updateFields['currentPrice'] = newPrice;
      updateFields['$push'] = {
        priceHistory: {
          $each: [{ price: newPrice, recordedAt: new Date() }],
          $slice: -PRICE_HISTORY_MAX,
        },
      };
    }

    const updated = await this.stockModel
      .findByIdAndUpdate(id, updateFields, { new: true })
      .lean();

    if (!updated) throw new NotFoundException('Stock not found');

    // Invalidate cache
    await this.cacheService.del(REDIS_KEYS.stockCache(id.toString()));
    await this.cacheService.del(REDIS_KEYS.stockCatalogue);

    // Emit to Kafka — alert-worker handles batch processing
    if (priceChanged && dto.currentPrice !== undefined) {
      this.messagingService.emitPriceUpdated({
        stockId: id.toString(),
        ticker: (updated as Stock).ticker,
        newPrice: dto.currentPrice,
      });
    }

    this.logger.log(`Stock updated: ${(updated as Stock).ticker}`);
    return updated as Stock;
  }
  async delist(id: Types.ObjectId): Promise<Stock> {
    const updated = await this.stockModel
      .findByIdAndUpdate(id, { $set: { isListed: false } }, { new: true })
      .lean();
    if (!updated) throw new NotFoundException('Stock not found');
    await this.cacheService.del(REDIS_KEYS.stockCache(id.toString()));
    await this.cacheService.del(REDIS_KEYS.stockCatalogue);
    this.logger.log(`Stock delisted: ${(updated as Stock).ticker}`);
    return updated as Stock;
  }

  async findAll(
    query: StockQueryDto,
  ): Promise<{ data: Stock[]; total: number }> {
    const cacheKey =
      query.page === 1 && !query.search && !query.sector
        ? REDIS_KEYS.stockCatalogue
        : null;
    if (cacheKey) {
      const cached = await this.cacheService.get<{
        data: Stock[];
        total: number;
      }>(cacheKey);
      if (cached) return cached;
    }

    const filter: Record<string, unknown> = { isListed: true };
    if (query.sector) filter['sector'] = query.sector;
    if (query.search) {
      filter['$or'] = [
        { companyName: { $regex: query.search, $options: 'i' } },
        { ticker: { $regex: query.search, $options: 'i' } },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [data, total] = await Promise.all([
      this.stockModel
        .find(filter, { priceHistory: 0 })
        .sort({ companyName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.stockModel.countDocuments(filter),
    ]);

    const result = { data: data as Stock[], total };
    if (cacheKey)
      await this.cacheService.set(cacheKey, result, this.catalogueCacheTtl);
    return result;
  }

  async findById(id: Types.ObjectId): Promise<Stock> {
    const cacheKey = REDIS_KEYS.stockCache(id.toString());
    const cached = await this.cacheService.get<Stock>(cacheKey);
    if (cached) return cached;

    const stock = await this.stockModel.findById(id).lean();
    if (!stock) throw new NotFoundException('Stock not found');

    await this.cacheService.set(cacheKey, stock, this.stockCacheTtl);
    return stock as Stock;
  }

  async findListedById(id: Types.ObjectId): Promise<Stock> {
    const stock = await this.findById(id);
    if (!stock.isListed)
      throw new NotFoundException(
        'This stock is not available for new buy orders',
      );
    return stock;
  }

  private async checkAlerts(stockId: string, newPrice: number): Promise<void> {
    const alerts = await this.alertModel
      .find({ stockId: new Types.ObjectId(stockId), triggered: false })
      .lean();

    const toTrigger = alerts.filter((a) => {
      const target = parseFloat(a.targetPrice.toString());
      return a.direction === AlertDirection.ABOVE
        ? newPrice >= target
        : newPrice <= target;
    });

    if (toTrigger.length === 0) return;

    await this.alertModel.updateMany(
      { _id: { $in: toTrigger.map((a) => a._id) } },
      { $set: { triggered: true } },
    );

    const memberIds = [...new Set(toTrigger.map((a) => a.memberId.toString()))];
    const traders = await this.traderModel
      .find({ _id: { $in: memberIds.map((id) => new Types.ObjectId(id)) } })
      .lean();
    const traderMap = new Map(traders.map((t) => [t._id.toString(), t]));
    const stock = await this.stockModel
      .findById(new Types.ObjectId(stockId))
      .lean();

    for (const alert of toTrigger) {
      const trader = traderMap.get(alert.memberId.toString());
      if (!trader) continue;
      this.messagingService.emitPriceAlert({
        userId: alert.memberId.toString(),
        email: trader.email,
        name: trader.fullName,
        ticker: alert.ticker,
        companyName: stock?.companyName ?? alert.ticker,
        targetPrice: parseFloat(alert.targetPrice.toString()),
        currentPrice: newPrice,
        direction: alert.direction as 'above' | 'below',
      });
    }
  }

  async getPriceHistory(
    id: Types.ObjectId,
    from?: string,
    to?: string,
  ): Promise<PriceHistoryEntry[]> {
    const stock = await this.stockModel.findById(id).lean();
    if (!stock) throw new NotFoundException('Stock not found');

    let history = (stock as Stock).priceHistory ?? [];

    if (from) {
      const fromDate = new Date(from);
      history = history.filter((h) => h.recordedAt >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      history = history.filter((h) => h.recordedAt <= toDate);
    }

    return history;
  }
}
