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
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import mongoose from 'mongoose';
import { InternalWalletService } from './internal-wallet.service';

export class InternalDeductDto {
  userId: string;
  amount: number;
  orderId: string; // idempotency key
}

export class InternalCreditDto {
  userId: string;
  amount: number;
  orderId: string; // idempotency key
}

@Controller('internal/wallet')
export class InternalWalletController {
  constructor(private readonly internalWalletService: InternalWalletService) {}

  /**
   * POST /internal/wallet/deduct
   * Called by trading-service on BUY order.
   * orderId is idempotency key — duplicate calls are safely rejected.
   */
  @Post('deduct')
  @HttpCode(HttpStatus.OK)
  deduct(@Body() dto: InternalDeductDto) {
    return this.internalWalletService.deduct(dto.userId, dto.amount, dto.orderId);
  }

  /**
   * POST /internal/wallet/credit
   * Called by trading-service on SELL order or refund.
   */
  @Post('credit')
  @HttpCode(HttpStatus.OK)
  credit(@Body() dto: InternalCreditDto) {
    return this.internalWalletService.credit(dto.userId, dto.amount, dto.orderId);
  }
}
