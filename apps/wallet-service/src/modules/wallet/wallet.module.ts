import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
// import { PassportModule } from '@nestjs/passport';

import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { Wallet, WalletSchema } from '../../database/schemas/wallet.schema';
import { TransactionModule } from '../transaction/transaction.module';
import { LockModule } from '../lock/lock.module';
import { KafkaClientModule } from '../messaging/kafka-client.module';
import { StripeModule } from '../stripe/stripe.module';
import { StripeWebhookController } from '../stripe/stripe-webhook.controller';

// Guards
import { CmsJwtAuthGuard } from '../../common/guards/cms-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }]),
    TransactionModule,
    LockModule,
    KafkaClientModule,
    StripeModule,
  ],
  controllers: [WalletController, StripeWebhookController],
  providers: [WalletService, CmsJwtAuthGuard, RolesGuard],
  exports: [WalletService],
})
export class WalletModule {}
