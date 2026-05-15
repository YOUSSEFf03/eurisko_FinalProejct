import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export interface AppConfig {
  port: number;
  mongodbUri: string;
  redis: { host: string; port: number; ttl: number };
  kafka: { brokers: string[] };
  jwt: { secret: string };
}

export const validationSchema = Joi.object({
  PORT: Joi.number().default(3002),
  MONGODB_URI: Joi.string().required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_CACHE_TTL: Joi.number().default(300),
  KAFKA_BROKERS: Joi.string().default('localhost:9092'),
  JWT_SECRET: Joi.string().required(),
  ALLOWED_ORIGINS: Joi.string().optional(),
});

export default registerAs(
  '',
  (): AppConfig => ({
    port: parseInt(process.env['PORT'] ?? '3002', 10),
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
  }),
);
