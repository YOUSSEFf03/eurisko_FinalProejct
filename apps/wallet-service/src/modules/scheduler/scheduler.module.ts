// apps/wallet-service/src/modules/scheduler/scheduler.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { NegativeBalanceScheduler } from './negative-balance.scheduler';
import { Wallet, WalletSchema } from '../../database/schemas/wallet.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([{ name: Wallet.name, schema: WalletSchema }]),
  ],
  providers: [NegativeBalanceScheduler],
  exports: [NegativeBalanceScheduler],
})
export class SchedulerModule {}
