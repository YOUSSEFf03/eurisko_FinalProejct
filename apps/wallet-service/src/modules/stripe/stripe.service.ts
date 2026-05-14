import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// Import Stripe as a value (constructor) — the type is derived from the instance
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Stripe = require('stripe');
import { AppConfig } from '../../config/app.config';

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
}

export interface StripeDepositMeta {
  userId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}

// Define only the fields we read — avoids Stripe namespace export issues
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

export interface StripeSession {
  id: string;
  url: string | null;
  payment_status: string;
  payment_intent: string | { id: string } | null;
  metadata: Record<string, string> | null;
}

@Injectable()
export class StripeService {
  // Use ReturnType to derive the instance type from the constructor
  private readonly client: InstanceType<typeof Stripe>;
  private readonly webhookSecret: string;
  private readonly logger = new Logger(StripeService.name);

  constructor(private readonly configService: ConfigService<AppConfig>) {
    const secretKey =
      this.configService.get('stripe.secretKey', { infer: true }) ?? '';
    this.webhookSecret =
      this.configService.get('stripe.webhookSecret', { infer: true }) ?? '';

    this.client = new Stripe(secretKey, {
      apiVersion: '2026-04-22.dahlia',
      typescript: true,
    });
  }

  /**
   * Creates a Stripe Checkout Session for a wallet deposit.
   * Amount is in USD — converted to cents for Stripe.
   */
  async createDepositSession(
    meta: StripeDepositMeta,
    successUrl: string,
    cancelUrl: string,
  ): Promise<CheckoutSessionResult> {
    const session = await this.client.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: meta.currency.toLowerCase(),
            product_data: {
              name: 'Wallet Deposit',
              description: `Deposit $${meta.amount} to your trading wallet`,
            },
            unit_amount: Math.round(meta.amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: meta.userId,
        amount: String(meta.amount),
        currency: meta.currency,
        idempotencyKey: meta.idempotencyKey,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      throw new BadRequestException('Stripe did not return a checkout URL');
    }

    this.logger.log(
      `Checkout session created: ${session.id} | userId=${meta.userId} | amount=${meta.amount}`,
    );

    return { sessionId: session.id, checkoutUrl: session.url };
  }

  /**
   * Verifies the Stripe webhook signature and returns the event.
   * rawBody MUST be the raw Buffer — never the JSON-parsed body.
   */
  constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
  ): StripeWebhookEvent {
    try {
      const tolerance =
        process.env['NODE_ENV'] === 'production'
          ? undefined // default 300s in prod
          : 600; // 10 minutes for local Docker clock drift

      const event = this.client.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
        tolerance,
      ) as unknown as StripeWebhookEvent;

      return event;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Webhook signature verification failed: ${msg}`);
      throw new BadRequestException(`Webhook signature invalid: ${msg}`);
    }
  }

  /**
   * Extracts deposit metadata from the completed checkout session object.
   */
  extractDepositMeta(session: StripeSession): StripeDepositMeta | null {
    const { userId, amount, currency, idempotencyKey } = session.metadata ?? {};

    // Sessions not created by our initiate endpoint won't have metadata
    if (!userId || !amount || !currency || !idempotencyKey) {
      return null;
    }

    return {
      userId,
      amount: parseFloat(amount),
      currency,
      idempotencyKey,
    };
  }
}
