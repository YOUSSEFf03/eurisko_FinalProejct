/* eslint-disable @typescript-eslint/no-require-imports */
import { registerAs } from '@nestjs/config';
import Joi = require('joi');

export interface GatewayConfig {
  port: number;
  nodeEnv: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  throttle: {
    ttl: number;
    limit: number;
  };
  cors: {
    origins: string[];
  };
}

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),
  ALLOWED_ORIGINS: Joi.string().default('*'),
  AUTH_SERVICE_URL: Joi.string().default('http://auth-service:3003'),
  WALLET_SERVICE_URL: Joi.string().default('http://wallet-service:3005'),
});

export default registerAs(
  'gateway',
  (): GatewayConfig => ({
    port: parseInt(process.env['PORT'] ?? '3000', 10),
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
    jwt: {
      secret: process.env['JWT_SECRET'] ?? '',
      expiresIn: process.env['JWT_EXPIRES_IN'] ?? '15m',
    },
    throttle: {
      ttl: parseInt(process.env['THROTTLE_TTL'] ?? '60', 10),
      limit: parseInt(process.env['THROTTLE_LIMIT'] ?? '100', 10),
    },
    cors: {
      origins: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['*'],
    },
  }),
);
