import { Module } from '@nestjs/common';
import { WalletProxyController } from './wallet-proxy.controller';
import { WalletProxyService } from './wallet-proxy.service';

@Module({
  controllers: [WalletProxyController],
  providers: [WalletProxyService],
})
export class WalletProxyModule {}
