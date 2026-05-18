import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Member,
  MemberDocument,
  MemberStatus,
  KycStatus,
} from '../../database/schemas/member.schema';
import { CacheService } from '../cache/cache.service';
import { MemberEventsService } from '../messaging/member-events.service';
import { REDIS_KEYS } from '../../common/constants';
import { PaginatedResult, PaginationMeta } from '../../common/types';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberQueryDto } from './dto/member-query.dto';
import { CmsKycDto } from './dto/cms-kyc.dto';
import { CmsSuspendDto } from './dto/cms-suspend.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MemberService {
  private readonly logger = new Logger(MemberService.name);

  constructor(
    @InjectModel(Member.name)
    private readonly memberModel: Model<MemberDocument>,
    private readonly cacheService: CacheService,
    private readonly memberEventsService: MemberEventsService,
    private readonly httpService: HttpService,
  ) {}

  // ─── Member: GET /members/me ──────────────────────────────────────────────

  async getProfile(userId: string): Promise<MemberDocument> {
    const cacheKey = REDIS_KEYS.memberProfile(userId);

    // 1. Try cache first
    const cached = await this.cacheService.get<MemberDocument>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT | userId=${userId}`);
      return cached;
    }

    // 2. Cache miss — query MongoDB
    this.logger.debug(`Cache MISS | userId=${userId}`);
    const member = await this.memberModel
      .findById(new Types.ObjectId(userId))
      .lean()
      .exec();

    if (!member) {
      throw new NotFoundException('Member profile not found');
    }

    // 3. Populate cache for next request
    await this.cacheService.set(cacheKey, member);

    return member as MemberDocument;
  }

  // ─── Member: PUT /members/me ──────────────────────────────────────────────

  async updateProfile(
    userId: string,
    dto: UpdateMemberDto,
  ): Promise<MemberDocument> {
    const member = await this.memberModel
      .findByIdAndUpdate(
        new Types.ObjectId(userId),
        { $set: dto },
        { new: true, runValidators: true },
      )
      .lean()
      .exec();

    if (!member) {
      throw new NotFoundException('Member profile not found');
    }

    // Invalidate cache — next GET will repopulate from MongoDB
    await this.cacheService.del(REDIS_KEYS.memberProfile(userId));
    this.logger.log(`Profile updated | userId=${userId}`);

    return member as MemberDocument;
  }

  // ─── Member: GET /members/me/portfolio ───────────────────────────────────

  /**
   * Portfolio placeholder — returns empty structure until order-service is built.
   * order-service will publish portfolio update events; this will consume them.
   */
  async getPortfolio(userId: string): Promise<{
    positions: unknown[];
    totalValue: number;
    totalProfitLoss: number;
  }> {
    // Confirm member exists first
    await this.getProfile(userId);

    const cacheKey = `portfolio:${userId}`;

    // Try cache
    const cached = await this.cacheService.get<{
      positions: unknown[];
      totalValue: number;
      totalProfitLoss: number;
    }>(cacheKey);
    if (cached) return cached;

    // Fetch live from trading-service
    try {
      const tradingUrl =
        process.env['TRADING_SERVICE_URL'] ?? 'http://trading-service:3006';

      const resp = await firstValueFrom(
        this.httpService.get(
          `${tradingUrl}/api/v1/portfolio/${userId}/summary`,
          {
            timeout: 8_000,
          },
        ),
      );
      const portfolio = resp.data;

      // Cache for 60s — invalidated by trading-service on every trade
      await this.cacheService.set(cacheKey, portfolio, 60);

      return portfolio;
    } catch (err) {
      this.logger.warn(
        `Could not fetch portfolio from trading-service: ${(err as Error).message}`,
      );
      // Graceful degradation — return empty portfolio rather than 500
      return { positions: [], totalValue: 0, totalProfitLoss: 0 };
    }
  }

  // ─── CMS: GET /cms/members ────────────────────────────────────────────────

  async listMembers(
    query: MemberQueryDto,
  ): Promise<PaginatedResult<MemberDocument>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, unknown> = {};
    if (query.status) filter['status'] = query.status;
    if (query.kycStatus) filter['kycStatus'] = query.kycStatus;
    if (query.search) {
      // MongoDB text index search — covers fullName and email
      filter['$text'] = { $search: query.search };
    }

    const [items, total] = await Promise.all([
      this.memberModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.memberModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    const meta: PaginationMeta = {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return { items: items as MemberDocument[], meta };
  }

  // ─── CMS: GET /cms/members/:id ────────────────────────────────────────────

  async getMemberById(memberId: string): Promise<MemberDocument> {
    const cacheKey = REDIS_KEYS.memberProfile(memberId);

    const cached = await this.cacheService.get<MemberDocument>(cacheKey);
    if (cached) return cached;

    const member = await this.memberModel
      .findById(new Types.ObjectId(memberId))
      .lean()
      .exec();

    if (!member) throw new NotFoundException('Member not found');

    await this.cacheService.set(cacheKey, member);
    return member as MemberDocument;
  }

  // ─── CMS: PATCH /cms/members/:id/suspend ─────────────────────────────────

  async suspendMember(
    memberId: string,
    dto: CmsSuspendDto,
  ): Promise<MemberDocument> {
    const member = await this.memberModel
      .findById(new Types.ObjectId(memberId))
      .exec();
    if (!member) throw new NotFoundException('Member not found');

    if (member.status === MemberStatus.SUSPENDED) {
      throw new BadRequestException('Member is already suspended');
    }

    member.status = MemberStatus.SUSPENDED;
    member.suspensionReason = dto.reason ?? null;
    await member.save();

    // Invalidate cache
    await this.cacheService.del(REDIS_KEYS.memberProfile(memberId));

    // Publish event — auth-service will sync User.status to SUSPENDED
    this.memberEventsService.emitMemberSuspended({
      userId: memberId,
      reason: dto.reason ?? null,
    });

    this.logger.log(
      `Member suspended | userId=${memberId} | reason=${dto.reason ?? 'none'}`,
    );
    return member;
  }

  // ─── CMS: PATCH /cms/members/:id/unsuspend ───────────────────────────────

  async unsuspendMember(memberId: string): Promise<MemberDocument> {
    const member = await this.memberModel
      .findById(new Types.ObjectId(memberId))
      .exec();
    if (!member) throw new NotFoundException('Member not found');

    if (member.status !== MemberStatus.SUSPENDED) {
      throw new BadRequestException('Member is not suspended');
    }

    member.status = MemberStatus.ACTIVE;
    member.suspensionReason = null;
    await member.save();

    await this.cacheService.del(REDIS_KEYS.memberProfile(memberId));

    // Publish event — auth-service will sync User.status to ACTIVE
    this.memberEventsService.emitMemberActivated({ userId: memberId });

    this.logger.log(`Member unsuspended | userId=${memberId}`);
    return member;
  }

  // ─── CMS: PATCH /cms/members/:id/kyc ─────────────────────────────────────

  async updateKyc(memberId: string, dto: CmsKycDto): Promise<MemberDocument> {
    if (dto.kycStatus === KycStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException(
        'rejectionReason is required when rejecting KYC',
      );
    }

    const member = await this.memberModel
      .findById(new Types.ObjectId(memberId))
      .exec();
    if (!member) throw new NotFoundException('Member not found');

    member.kycStatus = dto.kycStatus;
    await member.save();

    await this.cacheService.del(REDIS_KEYS.memberProfile(memberId));

    // Publish event — other services can react to KYC approval
    this.memberEventsService.emitMemberKycUpdated({
      userId: memberId,
      kycStatus: dto.kycStatus,
      rejectionReason: dto.rejectionReason,
    });

    this.logger.log(
      `KYC updated | userId=${memberId} | status=${dto.kycStatus}`,
    );
    return member;
  }

  // ─── CMS (Admin only): GET /cms/analytics/member-growth ──────────────────
  //
  // Returns:
  //   totalMembers       — total registered members (all time)
  //   thisMonth          — members registered this calendar month
  //   lastMonth          — members registered last calendar month
  //   growthRate         — month-over-month % change
  //   monthlyBreakdown   — last 6 months, one entry per month

  async getMemberGrowth(): Promise<{
    totalMembers: number;
    thisMonth: number;
    lastMonth: number;
    growthRate: number;
    monthlyBreakdown: { month: string; count: number }[];
  }> {
    const now = new Date();

    // Start of this month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    // Start of last month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    // Start of 6 months ago
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [totalMembers, thisMonth, lastMonth, monthlyBreakdown] =
      await Promise.all([
        // Total all-time
        this.memberModel.countDocuments().exec(),

        // This month
        this.memberModel
          .countDocuments({ createdAt: { $gte: thisMonthStart } })
          .exec(),

        // Last month
        this.memberModel
          .countDocuments({
            createdAt: { $gte: lastMonthStart, $lt: thisMonthStart },
          })
          .exec(),

        // Monthly breakdown — raw aggregation pipeline
        this.memberModel.aggregate([
          { $match: { createdAt: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m', date: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, month: '$_id', count: 1 } },
        ]),
      ]);

    const growthRate =
      lastMonth === 0
        ? thisMonth > 0
          ? 100
          : 0
        : parseFloat((((thisMonth - lastMonth) / lastMonth) * 100).toFixed(2));

    return {
      totalMembers,
      thisMonth,
      lastMonth,
      growthRate,
      monthlyBreakdown,
    };
  }
}
