import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../../database/schemas/order.schema';
import {
  Position,
  PositionDocument,
} from '../../database/schemas/position.schema';
import { StockService } from '../stock/stock.service';
import { TraderService } from '../trader/trader.service';
import { WalletClient } from './wallet.client';
import { MessagingService } from '../messaging/messaging.service';
import { CacheService } from '../cache/cache.service';
import { LockService } from '../lock/lock.service';
import { PlaceOrderDto, OrderHistoryQueryDto } from './dto/order.dto';
import { OrderStatus, OrderType, REDIS_KEYS } from '../../common/constants';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Position.name)
    private readonly positionModel: Model<PositionDocument>,
    private readonly stockService: StockService,
    private readonly traderService: TraderService,
    private readonly walletClient: WalletClient,
    private readonly messagingService: MessagingService,
    private readonly cacheService: CacheService,
    private readonly lockService: LockService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // BUY ORDER
  // ─────────────────────────────────────────────────────────────────────────

  async buy(memberId: string, dto: PlaceOrderDto): Promise<Order> {
    // 1. Guard: trader must be active + KYC approved
    const trader = await this.traderService.assertCanTrade(memberId);

    // 2. Stock must exist and be listed
    const stockId = new Types.ObjectId(dto.stockId);
    const stock = await this.stockService.findListedById(stockId);

    // 3. Calculate cost
    const pricePerShare = parseFloat(stock.currentPrice.toString());
    const totalAmount = dto.shares * pricePerShare;

    return this.lockService.withMemberLock(memberId, async () => {
      // 4. Create PENDING order — audit trail entry
      const order = await this.orderModel.create({
        memberId: new Types.ObjectId(memberId),
        stockId,
        ticker: stock.ticker,
        companyName: stock.companyName,
        type: OrderType.BUY,
        status: OrderStatus.PENDING,
        shares: dto.shares,
        pricePerShare: Types.Decimal128.fromString(String(pricePerShare)),
        totalAmount: Types.Decimal128.fromString(String(totalAmount)),
      });

      try {
        // 5. Deduct from wallet (orderId = idempotency key)
        await this.walletClient.deduct(
          memberId,
          totalAmount,
          order._id.toString(),
        );
      } catch (err) {
        // Compensate: mark order rejected
        await this.orderModel.findByIdAndUpdate(order._id, {
          $set: {
            status: OrderStatus.REJECTED,
            rejectionReason: (err as Error).message,
          },
        });
        throw err;
      }

      // 6. Atomic position upsert (weighted avg cost)
      await this.upsertPosition(
        new Types.ObjectId(memberId),
        stockId,
        stock.ticker,
        stock.companyName,
        dto.shares,
        pricePerShare,
      );

      // 7. Mark order EXECUTED
      const executed = await this.orderModel
        .findByIdAndUpdate(
          order._id,
          {
            $set: {
              status: OrderStatus.EXECUTED,
              executedAt: new Date(),
            },
          },
          { new: true },
        )
        .lean();

      // 8. Invalidate portfolio cache
      await this.cacheService.del(REDIS_KEYS.portfolioCache(memberId));

      // 9. Publish Kafka event (non-blocking)
      this.messagingService.emitTradeExecuted({
        userId: memberId,
        email: trader.email,
        name: trader.fullName,
        tradeType: 'BUY',
        ticker: stock.ticker,
        companyName: stock.companyName,
        shares: dto.shares,
        pricePerShare,
        totalAmount,
        transactionId: order._id.toString(),
      });

      this.logger.log(
        `BUY executed | member=${memberId} | ${stock.ticker} x${dto.shares} @ ${pricePerShare}`,
      );

      return executed as Order;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SELL ORDER
  // ─────────────────────────────────────────────────────────────────────────

  async sell(memberId: string, dto: PlaceOrderDto): Promise<Order> {
    // 1. Guard: trader must be active + KYC approved
    const trader = await this.traderService.assertCanTrade(memberId);

    // 2. Stock must exist (can sell even if delisted)
    const stockId = new Types.ObjectId(dto.stockId);
    const stock = await this.stockService.findById(stockId);

    const pricePerShare = parseFloat(stock.currentPrice.toString());
    const totalAmount = dto.shares * pricePerShare;

    return this.lockService.withMemberLock(memberId, async () => {
      // 3. Check position + shares available (atomic guard)
      const position = await this.positionModel.findOneAndUpdate(
        {
          memberId: new Types.ObjectId(memberId),
          stockId,
          shares: { $gte: dto.shares },
        },
        { $inc: { shares: -dto.shares } },
        { new: true },
      );

      if (!position) {
        throw new BadRequestException(
          'Insufficient shares or position not found',
        );
      }

      const avgBuyPrice = parseFloat(position.avgBuyPrice.toString());
      const profitLoss = (pricePerShare - avgBuyPrice) * dto.shares;

      // 4. Create PENDING order
      const order = await this.orderModel.create({
        memberId: new Types.ObjectId(memberId),
        stockId,
        ticker: stock.ticker,
        companyName: stock.companyName,
        type: OrderType.SELL,
        status: OrderStatus.PENDING,
        shares: dto.shares,
        pricePerShare: Types.Decimal128.fromString(String(pricePerShare)),
        totalAmount: Types.Decimal128.fromString(String(totalAmount)),
        profitLoss: Types.Decimal128.fromString(String(profitLoss)),
      });

      try {
        // 5. Credit wallet
        await this.walletClient.credit(
          memberId,
          totalAmount,
          order._id.toString(),
        );
      } catch (err) {
        // Rollback: restore position shares
        await this.positionModel.findOneAndUpdate(
          { memberId: new Types.ObjectId(memberId), stockId },
          { $inc: { shares: dto.shares } },
        );
        await this.orderModel.findByIdAndUpdate(order._id, {
          $set: {
            status: OrderStatus.REJECTED,
            rejectionReason: (err as Error).message,
          },
        });
        throw err;
      }

      // 6. Clean up zero-share positions
      if (position.shares === 0) {
        await this.positionModel.deleteOne({
          memberId: new Types.ObjectId(memberId),
          stockId,
        });
      }

      // 7. Mark EXECUTED
      const executed = await this.orderModel
        .findByIdAndUpdate(
          order._id,
          {
            $set: {
              status: OrderStatus.EXECUTED,
              executedAt: new Date(),
            },
          },
          { new: true },
        )
        .lean();

      // 8. Invalidate portfolio cache
      await this.cacheService.del(REDIS_KEYS.portfolioCache(memberId));

      // 9. Publish Kafka event
      this.messagingService.emitTradeExecuted({
        userId: memberId,
        email: trader.email,
        name: trader.fullName,
        tradeType: 'SELL',
        ticker: stock.ticker,
        companyName: stock.companyName,
        shares: dto.shares,
        pricePerShare,
        totalAmount,
        profitLoss,
        transactionId: order._id.toString(),
      });

      this.logger.log(
        `SELL executed | member=${memberId} | ${stock.ticker} x${dto.shares} @ ${pricePerShare} | P&L: ${profitLoss.toFixed(2)}`,
      );

      return executed as Order;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // READ
  // ─────────────────────────────────────────────────────────────────────────

  async getHistory(
    memberId: string,
    query: OrderHistoryQueryDto,
  ): Promise<{ data: Order[]; nextCursor: string | null }> {
    const filter: Record<string, unknown> = {
      memberId: new Types.ObjectId(memberId),
    };

    if (query.type) filter['type'] = query.type;
    if (query.status) filter['status'] = query.status;

    // Cursor-based pagination (better than skip for deep pages)
    if (query.cursor) {
      filter['_id'] = { $lt: new Types.ObjectId(query.cursor) };
    }

    const limit = query.limit ?? 20;

    const orders = await this.orderModel
      .find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = orders.length > limit;
    const data = hasMore ? orders.slice(0, limit) : orders;
    const nextCursor = hasMore
      ? (data[data.length - 1]?._id as Types.ObjectId).toString()
      : null;

    return { data: data as Order[], nextCursor };
  }

  async findOne(orderId: Types.ObjectId, memberId: string): Promise<Order> {
    const order = await this.orderModel
      .findOne({
        _id: orderId,
        memberId: new Types.ObjectId(memberId),
      })
      .lean();

    if (!order) throw new NotFoundException('Order not found');
    return order as Order;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Atomic position upsert with weighted average cost calculation.
   */
  private async upsertPosition(
    memberId: Types.ObjectId,
    stockId: Types.ObjectId,
    ticker: string,
    companyName: string,
    shares: number,
    pricePerShare: number,
  ): Promise<void> {
    const cost = shares * pricePerShare;

    const existing = await this.positionModel.findOne({ memberId, stockId });

    if (!existing) {
      await this.positionModel.create({
        memberId,
        stockId,
        ticker,
        companyName,
        shares,
        avgBuyPrice: Types.Decimal128.fromString(String(pricePerShare)),
        totalInvested: Types.Decimal128.fromString(String(cost)),
      });
      return;
    }

    const prevShares = existing.shares;
    const prevTotal = parseFloat(existing.totalInvested.toString());
    const newShares = prevShares + shares;
    const newTotal = prevTotal + cost;
    const newAvg = newTotal / newShares;

    await this.positionModel.findOneAndUpdate(
      { memberId, stockId },
      {
        $inc: { shares },
        $set: {
          avgBuyPrice: Types.Decimal128.fromString(String(newAvg)),
          totalInvested: Types.Decimal128.fromString(String(newTotal)),
        },
      },
    );
  }
}
