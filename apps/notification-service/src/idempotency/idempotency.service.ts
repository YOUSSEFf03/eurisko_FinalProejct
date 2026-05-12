import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from './idempotency.constants';
import { RedisClientType } from 'redis';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly ttl: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientType,
    private readonly configService: ConfigService,
  ) {
    this.ttl =
      this.configService.get<number>('idempotency.ttlSeconds') ?? 86400;
  }

  async isDuplicate(key: string): Promise<boolean> {
    const exists = await this.redis.get(key);
    return exists !== null;
  }

  async markProcessed(key: string): Promise<void> {
    await this.redis.set(key, '1', { EX: this.ttl });
    this.logger.debug(`Idempotency key set: ${key}`);
  }

  buildKey(type: string, userId: string, uniqueField: string): string {
    return `notification:${type}:${userId}:${uniqueField}`;
  }
}
