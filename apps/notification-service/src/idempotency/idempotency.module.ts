import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { IdempotencyService } from './idempotency.service';
import { REDIS_CLIENT } from './idempotency.constants';

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: async (cs: ConfigService) => {
        const client = createClient({
          socket: {
            host: cs.get<string>('redis.host') ?? 'redis',
            port: cs.get<number>('redis.port') ?? 6379,
          },
        });
        await client.connect();
        return client;
      },
    },
    IdempotencyService,
  ],
  exports: [REDIS_CLIENT, IdempotencyService],
})
export class IdempotencyModule {}
