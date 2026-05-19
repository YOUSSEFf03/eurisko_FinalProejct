import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PriceAlert,
  PriceAlertDocument,
} from '../../database/schemas/alert.schema';
import { Trader, TraderDocument } from '../../database/schemas/trader.schema';
import { Stock, StockDocument } from '../../database/schemas/stock.schema';
import { MessagingService } from '../messaging/messaging.service';
import { CreateAlertDto } from './dto/alert.dto';
import { AlertDirection } from '../../common/constants';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    @InjectModel(PriceAlert.name)
    private readonly alertModel: Model<PriceAlertDocument>,
    @InjectModel(Trader.name)
    private readonly traderModel: Model<TraderDocument>,
    @InjectModel(Stock.name)
    private readonly stockModel: Model<StockDocument>,
    private readonly messagingService: MessagingService,
  ) {}

  async create(memberId: string, dto: CreateAlertDto): Promise<PriceAlert> {
    const stockId = new Types.ObjectId(dto.stockId);

    // Stock must exist
    const stock = await this.stockModel.findById(stockId).lean();
    if (!stock) throw new NotFoundException('Stock not found');

    // Get trader for email/name — needed by alert-worker
    const trader = await this.traderModel
      .findById(new Types.ObjectId(memberId))
      .lean();
    if (!trader) throw new NotFoundException('Trader profile not found');

    const alert = await this.alertModel.create({
      memberId: new Types.ObjectId(memberId),
      stockId,
      ticker: stock.ticker,
      targetPrice: Types.Decimal128.fromString(String(dto.targetPrice)),
      direction: dto.direction,
      memberEmail: trader.email, // ← ADD
      memberName: trader.fullName, // ← ADD
      triggered: false,
    });

    this.logger.log(
      `Alert created: ${stock.ticker} ${dto.direction} ${dto.targetPrice} for member ${memberId}`,
    );

    return alert;
  }

  async findByMember(memberId: string): Promise<PriceAlert[]> {
    return this.alertModel
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ createdAt: -1 })
      .lean() as unknown as PriceAlert[];
  }

  async remove(alertId: Types.ObjectId, memberId: string): Promise<void> {
    const alert = await this.alertModel.findOne({
      _id: alertId,
      memberId: new Types.ObjectId(memberId),
    });

    if (!alert) throw new NotFoundException('Alert not found');

    await this.alertModel.deleteOne({ _id: alertId });
  }

  /**
   * Called async after every stock price update — never blocks the response.
   */
  async checkAlertsForStock(stockId: string, newPrice: number): Promise<void> {
    const alerts = await this.alertModel
      .find({ stockId: new Types.ObjectId(stockId), triggered: false })
      .lean();

    const toTrigger = alerts.filter((alert) => {
      const target = parseFloat(alert.targetPrice.toString());
      return alert.direction === AlertDirection.ABOVE
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

      this.logger.log(
        `Price alert triggered: ${alert.ticker} for member ${alert.memberId.toString()}`,
      );
    }
  }
}
