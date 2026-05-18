import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CmsAuthProxyController } from './cms-auth-proxy.controller';
import { CmsAuthProxyService } from './cms-auth-proxy.service';

@Module({
  imports: [HttpModule],
  controllers: [CmsAuthProxyController],
  providers: [CmsAuthProxyService],
})
export class CmsAuthProxyModule {}
