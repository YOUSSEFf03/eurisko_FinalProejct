import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';

import {
  StripeService,
  StripeWebhookEvent,
  StripeSession,
} from './stripe.service';
import { WalletService } from '../wallet/wallet.service';
import { Public } from '../../common/decorators/public.decorators';

/**
 * StripeWebhookController
 *
 * CRITICAL: This route must receive the RAW (unparsed) request body.
 * Stripe computes the webhook signature over the raw bytes.
 * express.raw() is scoped to this path in main.ts.
 */
@Controller('wallet/deposit')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly walletService: WalletService,
  ) {}

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;

    if (!rawBody) {
      throw new BadRequestException(
        'Missing raw body — ensure rawBody: true in NestFactory',
      );
    }
    const event: StripeWebhookEvent = this.stripeService.constructWebhookEvent(
      rawBody,
      signature,
    );

    this.logger.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        // Use type assertion — Stripe.Event.Data types vary by event
        const session = event.data.object as unknown as StripeSession;

        if (session.payment_status !== 'paid') {
          this.logger.warn(
            `Session ${session.id} completed but not paid — skipping`,
          );
          break;
        }

        // Sessions not created by us won't have our metadata — skip silently
        const meta = this.stripeService.extractDepositMeta(session);
        if (!meta) {
          this.logger.warn(
            `Session ${session.id} has no wallet metadata — skipping`,
          );
          break;
        }

        await this.walletService.processStripeDeposit({
          userId: meta.userId,
          amount: meta.amount,
          currency: meta.currency,
          idempotencyKey: meta.idempotencyKey,
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : undefined,
        });

        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as unknown as { id: string };
        this.logger.log(`Checkout session expired: ${session.id}`);
        break;
      }

      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }
}
