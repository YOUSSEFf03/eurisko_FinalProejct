import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export interface AppConfig {
  mongodbUri: string;
  port: number;
  throttle: { ttl: number; limit: number };
  kafka: { brokers: string[] };
  otp: { expiresMinutes: number };
  jwt: { secret: string; accessExpiresIn: string; refreshExpiresIn: string };
}

export const validationSchema = Joi.object({
  MONGODB_URI: Joi.string().required(),
  PORT: Joi.number().default(3001),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(10),
  KAFKA_BROKERS: Joi.string().default('localhost:9092'),
  OTP_EXPIRES_MINUTES: Joi.number().default(10),
  JWT_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  ALLOWED_ORIGINS: Joi.string().optional(),
});

export default registerAs(
  '',
  (): AppConfig => ({
    mongodbUri: process.env['MONGODB_URI'] ?? '',
    port: parseInt(process.env['PORT'] ?? '3001', 10),
    throttle: {
      ttl: parseInt(process.env['THROTTLE_TTL'] ?? '60', 10),
      limit: parseInt(process.env['THROTTLE_LIMIT'] ?? '10', 10),
    },
    kafka: {
      brokers: (process.env['KAFKA_BROKERS'] ?? 'localhost:9092')
        .split(',')
        .map((broker) => broker.trim())
        .filter(Boolean),
    },
    otp: {
      expiresMinutes: parseInt(process.env['OTP_EXPIRES_MINUTES'] ?? '10', 10),
    },
    jwt: {
      secret: process.env['JWT_SECRET'] ?? 'secret',
      accessExpiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
      refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
    },
  }),
);
