import { Module } from '@nestjs/common';
import { LockService } from './lock.service';
import { RedisCacheModule } from '../cache/cache.module';

@Module({
  imports: [RedisCacheModule],
  providers: [LockService],
  exports: [LockService],
})
export class LockModule {}
