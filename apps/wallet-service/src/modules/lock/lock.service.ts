import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { REDIS_KEYS } from '../../common/constants';
import { AppConfig } from '../../config/app.config';

/**
 * WalletLockService — Redis-based distributed mutual exclusion.
 *
 * How it works:
 *   1. acquire(userId) → SET lock:wallet:{userId} {token} NX PX {ttl}
 *      - NX:  only set if key does NOT exist (atomic gate)
 *      - PX:  auto-expire after ttlMs — deadlock prevention if service crashes
 *      - Returns token string on success, null if lock is held by another request
 *
 *   2. release(userId, token) → Lua script checks value before DEL
 *      - Without this check: if lock expired and was re-acquired by another
 *        request, our DEL would destroy their lock — catastrophic bug.
 *      - Lua is atomic in Redis — no race between GET and DEL.
 *
 *   3. withLock(userId, fn) → acquire → execute → release
 *      - Always releases in a finally block — no leaked locks on exception.
 *      - Throws ServiceUnavailableException (503) if lock cannot be acquired.
 *        Callers can retry; 503 signals "try again" to the client.
 */

// Atomic check-and-delete Lua script
const RELEASE_SCRIPT = `
  if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
  else
    return 0
  end
`;

@Injectable()
export class LockService {
  private readonly logger = new Logger(LockService.name);
  private readonly ttlMs: number;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService<AppConfig>,
  ) {
    this.ttlMs = this.configService.get('lock.ttlMs', { infer: true }) ?? 5000;
  }

  /**
   * Attempt to acquire the wallet lock for a user.
   * Returns the lock token on success, null if already locked.
   */
  async acquire(userId: string): Promise<string | null> {
    const key = REDIS_KEYS.walletLock(userId);
    const token = randomUUID();

    // ioredis v4 type overloads don't expose SET NX EX together cleanly.
    // Using call() sidesteps the overload issue while keeping full runtime correctness.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    const result = (await (this.redis.set as Function).call(
      this.redis,
      key,
      token,
      'EX',
      Math.ceil(this.ttlMs / 1000),
      'NX',
    )) as string | null;

    if (result === 'OK') {
      this.logger.debug(`Lock acquired: ${key}`);
      return token;
    }

    this.logger.warn(`Lock contention: ${key} is held by another request`);
    return null;
  }

  /**
   * Release the lock only if we own it (token matches).
   * Silent no-op if lock has already expired — that is safe by design.
   */
  async release(userId: string, token: string): Promise<void> {
    const key = REDIS_KEYS.walletLock(userId);

    const released = (await this.redis.eval(
      RELEASE_SCRIPT,
      1,
      key,
      token,
    )) as number;

    if (released === 1) {
      this.logger.debug(`Lock released: ${key}`);
    } else {
      // Lock expired before we released — this is fine, TTL saved us from deadlock
      this.logger.warn(
        `Lock release no-op for ${key}: expired or already released`,
      );
    }
  }

  /**
   * Execute fn() inside an exclusive wallet lock.
   * Throws 503 if lock cannot be acquired (another operation in progress).
   * Always releases lock in finally — guaranteed no leak.
   *
   * Usage:
   *   const result = await this.lockService.withLock(userId, async () => {
   *     // critical section
   *   });
   */
  async withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    const token = await this.acquire(userId);

    if (!token) {
      throw new ServiceUnavailableException(
        'Wallet is currently locked by another operation. Please retry in a moment.',
      );
    }

    try {
      return await fn();
    } finally {
      await this.release(userId, token);
    }
  }
}
