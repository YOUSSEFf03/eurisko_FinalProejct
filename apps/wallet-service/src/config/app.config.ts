import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export interface AppConfig {
  port: number;
  mongodbUri: string;
  redis: { host: string; port: number; ttl: number };
  kafka: { brokers: string[] };
  jwt: { secret: string };
  stripe: { secretKey: string; webhookSecret: string };
  lock: { ttlMs: number };
  wallet: { withdrawalHoldHrs: number; minDeposit: number; maxDeposit: number };
}

export const validationSchema = Joi.object({
  PORT: Joi.number().default(3005),
  MONGODB_URI: Joi.string().required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_CACHE_TTL: Joi.number().default(300),
  KAFKA_BROKERS: Joi.string().default('localhost:9092'),
  JWT_SECRET: Joi.string().required(),
  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),
  LOCK_TTL_MS: Joi.number().default(5000),
  WITHDRAWAL_HOLD_HRS: Joi.number().default(48),
  MIN_DEPOSIT_AMOUNT: Joi.number().default(10),
  MAX_DEPOSIT_AMOUNT: Joi.number().default(100000),
  ALLOWED_ORIGINS: Joi.string().optional(),
});

export default registerAs(
  '',
  (): AppConfig => ({
    port: parseInt(process.env['PORT'] ?? '3005', 10),
    mongodbUri: process.env['MONGODB_URI'] ?? '',
    redis: {
      host: process.env['REDIS_HOST'] ?? 'localhost',
      port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
      ttl: parseInt(process.env['REDIS_CACHE_TTL'] ?? '300', 10),
    },
    kafka: {
      brokers: (process.env['KAFKA_BROKERS'] ?? 'localhost:9092')
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean),
    },
    jwt: {
      secret: process.env['JWT_SECRET'] ?? '',
    },
    stripe: {
      secretKey: process.env['STRIPE_SECRET_KEY'] ?? '',
      webhookSecret: process.env['STRIPE_WEBHOOK_SECRET'] ?? '',
    },
    lock: {
      ttlMs: parseInt(process.env['LOCK_TTL_MS'] ?? '5000', 10),
    },
    wallet: {
      withdrawalHoldHrs: parseInt(
        process.env['WITHDRAWAL_HOLD_HRS'] ?? '48',
        10,
      ),
      minDeposit: parseInt(process.env['MIN_DEPOSIT_AMOUNT'] ?? '10', 10),
      maxDeposit: parseInt(process.env['MAX_DEPOSIT_AMOUNT'] ?? '100000', 10),
    },
  }),
);
