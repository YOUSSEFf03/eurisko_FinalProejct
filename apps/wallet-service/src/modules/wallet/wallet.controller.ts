import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { WalletService } from './wallet.service';
import { TransactionService } from '../transaction/transaction.service';
import {
  InitiateDepositDto,
  WithdrawDto,
  RejectWithdrawalDto,
} from './dto/wallet.dto';
import { TransactionHistoryQueryDto } from './dto/history-query.dto';
import { CmsJwtAuthGuard } from '../../common/guards/cms-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  CurrentUser,
  RequestUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CmsRole } from '../../common/constants';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { ManualAdjustDto } from './dto/wallet.dto';
/**
 * WalletController
 *
 * Member routes (header guard via gateway):
 *   GET    /wallet/balance
 *   POST   /wallet/deposit/initiate
 *   POST   /wallet/withdraw
 *   GET    /wallet/history
 *
 * CMS routes (CmsJwtAuthGuard + RolesGuard):
 *   GET    /wallet/cms/withdrawals
 *   PATCH  /wallet/cms/withdrawals/:id/approve
 *   PATCH  /wallet/cms/withdrawals/:id/reject
 *
 * Stripe webhook (Public — no gateway headers):
 *   POST   /wallet/deposit/webhook  → StripeWebhookController
 */
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
  ) {}

  // ─── Member: Get balance ──────────────────────────────────────────────────

  @Get('balance')
  async getBalance(@CurrentUser('userId') userId: string) {
    const wallet = await this.walletService.ensureWallet(userId);
    return {
      balance: parseFloat(wallet.balance.toString()),
      currency: wallet.currency,
      lastDepositAt: wallet.lastDepositAt,
    };
  }

  // ─── Member: Initiate deposit ─────────────────────────────────────────────

  @Post('deposit/initiate')
  async initiateDeposit(
    @CurrentUser() user: RequestUser,
    @Body() dto: InitiateDepositDto,
  ) {
    return this.walletService.initiateDeposit(
      { userId: user.userId, email: user.email, name: '' },
      dto.amount,
    );
  }

  // ─── Member: Request withdrawal ───────────────────────────────────────────

  @Post('withdraw')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestWithdrawal(
    @CurrentUser() user: RequestUser,
    @Body() dto: WithdrawDto,
  ) {
    return this.walletService.requestWithdrawal(
      { userId: user.userId, email: user.email, name: '' },
      dto.amount,
    );
  }

  // ─── Member: Transaction history ──────────────────────────────────────────

  @Get('history')
  async getHistory(
    @CurrentUser('userId') userId: string,
    @Query() query: TransactionHistoryQueryDto,
  ) {
    return this.walletService.getHistory(userId, query);
  }

  // ─── CMS: Pending withdrawal queue ────────────────────────────────────────

  @Get('cms/withdrawals')
  @UseGuards(CmsJwtAuthGuard, RolesGuard)
  @Roles(CmsRole.ADMINISTRATOR, CmsRole.SUPPORT_AGENT)
  async getPendingWithdrawals(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.walletService.getPendingWithdrawals(
      Number(page),
      Number(limit),
    );
  }

  // ─── CMS: Approve withdrawal ──────────────────────────────────────────────

  @Patch('cms/withdrawals/:id/approve')
  @UseGuards(CmsJwtAuthGuard, RolesGuard)
  @Roles(CmsRole.ADMINISTRATOR, CmsRole.SUPPORT_AGENT)
  @HttpCode(HttpStatus.OK)
  async approveWithdrawal(
    @Param('id', ParseObjectIdPipe) transactionId: Types.ObjectId,
    @CurrentUser() cmsUser: RequestUser,
  ) {
    await this.walletService.approveWithdrawal(transactionId, cmsUser.userId, {
      userId: '',
      email: '',
      name: '',
    });
    return { message: 'Withdrawal approved successfully' };
  }

  // ─── CMS: Reject withdrawal ───────────────────────────────────────────────

  @Patch('cms/withdrawals/:id/reject')
  @UseGuards(CmsJwtAuthGuard, RolesGuard)
  @Roles(CmsRole.ADMINISTRATOR, CmsRole.SUPPORT_AGENT)
  @HttpCode(HttpStatus.OK)
  async rejectWithdrawal(
    @Param('id', ParseObjectIdPipe) transactionId: Types.ObjectId,
    @CurrentUser() cmsUser: RequestUser,
    @Body() dto: RejectWithdrawalDto,
  ) {
    await this.walletService.rejectWithdrawal(
      transactionId,
      dto.reason,
      cmsUser.userId,
      { userId: '', email: '', name: '' },
    );
    return { message: 'Withdrawal rejected' };
  }

  // ─── CMS: Manual wallet adjustment (Admin only) ───────────────────────────

  @Post('cms/adjust/:memberId')
  @UseGuards(CmsJwtAuthGuard, RolesGuard)
  @Roles(CmsRole.ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  async manualAdjust(
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
    @Body() dto: ManualAdjustDto,
    @CurrentUser() cmsUser: RequestUser,
  ) {
    return this.walletService.manualAdjustment(
      memberId.toString(),
      dto.amount,
      dto.justification,
      cmsUser.userId,
    );
  }
}
