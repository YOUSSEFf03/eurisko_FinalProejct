import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppConfig } from '../../config/app.config';

/**
 * CacheService — thin Redis wrapper for user-service.
 *
 * All methods are wrapped in try/catch.
 * Redis is a PERFORMANCE layer, not a CORRECTNESS layer.
 * If Redis is down, callers fall through to MongoDB silently.
 *
 * Key pattern: cache:member:{userId}
 * TTL: configurable via REDIS_CACHE_TTL env var (default 300s)
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly ttl: number;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService<AppConfig>,
  ) {
    this.ttl = this.configService.get('redis.ttl', { infer: true }) ?? 300;
  }

  /**
   * Get a cached value by key.
   * Returns null on cache miss OR if Redis is unavailable.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Redis GET failed for key="${key}": ${String(err)}`);
      return null;
    }
  }

  /**
   * Set a value with the default TTL.
   * Silently no-ops if Redis is unavailable.
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.set(key, serialized, 'EX', ttlSeconds ?? this.ttl);
    } catch (err) {
      this.logger.warn(`Redis SET failed for key="${key}": ${String(err)}`);
    }
  }

  /**
   * Delete a key immediately (cache invalidation on write).
   * Silently no-ops if Redis is unavailable.
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (err) {
      this.logger.warn(`Redis DEL failed for key="${key}": ${String(err)}`);
    }
  }
}
