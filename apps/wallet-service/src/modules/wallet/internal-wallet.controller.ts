// FILE: apps/wallet-service/src/modules/wallet/internal-wallet.controller.ts
//
// This controller exposes internal endpoints called ONLY by trading-service.
// NOT routed through api-gateway — service-to-service calls only.
// No JWT validation — relies on network isolation (Docker internal network).

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
} from '@nestjs/common';

import { InternalWalletService } from './internal-wallet.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CmsJwtAuthGuard } from '../../common/guards/cms-jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CmsRole } from '../../common/constants';
import {
  InternalDeductDto,
  InternalCreditDto,
} from './dto/internal-wallet.dto';

@Controller('internal/wallet')
export class InternalWalletController {
  walletService: any;
  constructor(private readonly internalWalletService: InternalWalletService) {}

  /**
   * POST /internal/wallet/deduct
   * Called by trading-service on BUY order.
   * orderId is idempotency key — duplicate calls are safely rejected.
   */
  @Post('deduct')
  @HttpCode(HttpStatus.OK)
  deduct(@Body() dto: InternalDeductDto) {
    return this.internalWalletService.deduct(
      dto.userId,
      dto.amount,
      dto.orderId,
    );
  }

  /**
   * POST /internal/wallet/credit
   * Called by trading-service on SELL order or refund.
   */
  @Post('credit')
  @HttpCode(HttpStatus.OK)
  credit(@Body() dto: InternalCreditDto) {
    return this.internalWalletService.credit(
      dto.userId,
      dto.amount,
      dto.orderId,
    );
  }

  @Get('cms/withdrawals/summary')
  @UseGuards(CmsJwtAuthGuard, RolesGuard)
  @Roles(CmsRole.ADMINISTRATOR, CmsRole.SUPPORT_AGENT)
  async getPendingWithdrawalsSummary() {
    return this.walletService.getPendingWithdrawalsSummary();
  }
}
