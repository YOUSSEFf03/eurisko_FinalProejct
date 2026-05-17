import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { REDIS_KEYS } from '../../common/constants';

@Injectable()
export class LockService {
  private readonly logger = new Logger(LockService.name);
  private readonly lockTtlMs: number;
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 200;

  constructor(
    private readonly cacheService: CacheService,
    private readonly cs: ConfigService,
  ) {
    this.lockTtlMs = cs.get<number>('LOCK_TTL_MS', 10_000);
  }

  /**
   * Wraps a critical section in a per-member Redis lock.
   * Retries up to maxRetries before throwing ConflictException.
   */
  async withMemberLock<T>(memberId: string, fn: () => Promise<T>): Promise<T> {
    const lockKey = REDIS_KEYS.memberLock(memberId);
    let token: string | null = null;
    let attempt = 0;

    while (attempt < this.maxRetries) {
      token = await this.cacheService.acquireLock(lockKey, this.lockTtlMs);
      if (token) break;
      attempt++;
      await this.sleep(this.retryDelayMs * attempt);
    }

    if (!token) {
      throw new ConflictException(
        'Another operation is in progress. Please retry in a moment.',
      );
    }

    try {
      return await fn();
    } finally {
      await this.cacheService.releaseLock(lockKey, token);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
