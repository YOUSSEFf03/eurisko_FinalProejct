import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { IdempotencyService } from './idempotency.service';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: async (cs: ConfigService) => {
        const client = createClient({
          socket: {
            host: cs.get<string>('redis.host'),
            port: cs.get<number>('redis.port'),
          },
        });
        await client.connect();
        return client;
      },
    },
    IdempotencyService,
  ],
  exports: [IdempotencyService],
})
export class IdempotencyModule {}
