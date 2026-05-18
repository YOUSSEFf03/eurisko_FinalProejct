import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { WalletProxyService } from './wallet-proxy.service';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/guards/jwt.strategy';

interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

@Controller('wallet')
export class WalletProxyController {
  constructor(private readonly walletProxy: WalletProxyService) {}

  // ─── Member routes ────────────────────────────────────────────────────────

  @Get('balance')
  getBalance(@Req() req: AuthRequest) {
    return this.walletProxy.forward(
      'GET',
      '/api/v1/wallet/balance',
      this.user(req),
    );
  }

  @Post('deposit/initiate')
  @HttpCode(HttpStatus.CREATED)
  initiateDeposit(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.walletProxy.forward(
      'POST',
      '/api/v1/wallet/deposit/initiate',
      this.user(req),
      body,
    );
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.ACCEPTED)
  requestWithdrawal(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.walletProxy.forward(
      'POST',
      '/api/v1/wallet/withdraw',
      this.user(req),
      body,
    );
  }

  @Get('history')
  getHistory(@Req() req: AuthRequest, @Query() query: Record<string, string>) {
    return this.walletProxy.forward(
      'GET',
      '/api/v1/wallet/history',
      this.user(req),
      undefined,
      query,
    );
  }

  // ─── CMS routes ───────────────────────────────────────────────────────────

  @Get('cms/withdrawals')
  getPendingWithdrawals(
    @Req() req: AuthRequest,
    @Query() query: Record<string, string>,
  ) {
    return this.walletProxy.forward(
      'GET',
      '/api/v1/wallet/cms/withdrawals',
      this.user(req),
      undefined,
      query,
    );
  }

  @Patch('cms/withdrawals/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveWithdrawal(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.walletProxy.forward(
      'PATCH',
      `/api/v1/wallet/cms/withdrawals/${id}/approve`,
      this.user(req),
    );
  }

  @Patch('cms/withdrawals/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectWithdrawal(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.walletProxy.forward(
      'PATCH',
      `/api/v1//wallet/cms/withdrawals/${id}/reject`,
      this.user(req),
      body,
    );
  }

  // ─── Stripe webhook — PUBLIC, no JWT ─────────────────────────────────────

  @Post('deposit/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  stripeWebhook(@Req() req: Request, @Body() body: unknown) {
    const signature = req.headers['stripe-signature'] as string;
    return this.walletProxy.forwardWebhook(body, signature);
  }

  // ─── Helper ───────────────────────────────────────────────────────────────

  private user(req: AuthRequest) {
    return {
      userId: req.user?.userId ?? '', // ✅ fixed: was req.user?.sub
      email: req.user?.email ?? '',
      role: req.user?.role ?? 'member',
    };
  }

  @Post('cms/adjust/:memberId')
  @HttpCode(HttpStatus.OK)
  manualAdjust(
    @Req() req: AuthRequest,
    @Param('memberId') memberId: string,
    @Body() body: unknown,
  ) {
    return this.walletProxy.forward(
      'POST',
      `/api/v1/wallet/cms/adjust/${memberId}`,
      this.user(req),
      body,
    );
  }

  @Get('cms/alerts/negative-balances')
  getNegativeBalances(@Req() req: AuthRequest) {
    return this.walletProxy.forward(
      'GET',
      '/api/v1/wallet/cms/alerts/negative-balances',
      this.user(req),
    );
  }

  @Get('cms/withdrawals/summary')
  getWithdrawalsSummary(@Req() req: AuthRequest) {
    return this.walletProxy.forward(
      'GET',
      '/api/v1/wallet/cms/withdrawals/summary',
      this.user(req),
    );
  }
  @Get('cms/transactions/:memberId/history')
  getCmsMemberHistory(
    @Req() req: AuthRequest,
    @Param('memberId') memberId: string,
    @Query() query: Record<string, string>,
  ) {
    return this.walletProxy.forward(
      'GET',
      `/api/v1/wallet/cms/transactions/${memberId}/history`,
      this.user(req),
      undefined,
      query,
    );
  }
}
