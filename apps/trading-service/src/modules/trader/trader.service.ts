import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Trader, TraderDocument } from '../../database/schemas/trader.schema';
import { TraderStatus, KycStatus } from '../../common/constants';

@Injectable()
export class TraderService {
  private readonly logger = new Logger(TraderService.name);

  constructor(
    @InjectModel(Trader.name)
    private readonly traderModel: Model<TraderDocument>,
  ) {}

  async upsertFromRegistration(payload: {
    _id: string;
    fullName: string;
    email: string;
  }): Promise<void> {
    await this.traderModel.findByIdAndUpdate(
      new Types.ObjectId(payload._id),
      {
        $set: {
          _id: new Types.ObjectId(payload._id),
          fullName: payload.fullName,
          email: payload.email,
          status: TraderStatus.ACTIVE,
          kycStatus: KycStatus.PENDING,
        },
      },
      { upsert: true, new: true },
    );
    this.logger.log(`Trader upserted: ${payload.email}`);
  }

  async updateStatus(memberId: string, status: TraderStatus): Promise<void> {
    await this.traderModel.findByIdAndUpdate(new Types.ObjectId(memberId), {
      $set: { status },
    });
  }

  async updateKycStatus(memberId: string, kycStatus: KycStatus): Promise<void> {
    await this.traderModel.findByIdAndUpdate(new Types.ObjectId(memberId), {
      $set: { kycStatus },
    });
  }

  /**
   * Called before every order. Throws if trader cannot trade.
   */
  async assertCanTrade(memberId: string): Promise<Trader> {
    const trader = await this.traderModel
      .findById(new Types.ObjectId(memberId))
      .lean();

    if (!trader) {
      throw new NotFoundException('Trader profile not found');
    }

    if (trader.status === TraderStatus.SUSPENDED) {
      throw new ForbiddenException('Your account is suspended');
    }

    if (trader.kycStatus !== KycStatus.APPROVED) {
      throw new ForbiddenException(
        'KYC verification must be approved before trading',
      );
    }

    return trader;
  }
}
