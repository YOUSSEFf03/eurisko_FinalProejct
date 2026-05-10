export default () => ({
  port: parseInt(process.env.PORT ?? '3004', 10),
  kafka: {
    brokers: (process.env.KAFKA_BROKERS ?? 'kafka:9092').split(','),
  },
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY ?? '',
    domain: process.env.MAILGUN_DOMAIN ?? '',
    from: process.env.MAILGUN_FROM ?? '',
  },
  mongodb: {
    uri: process.env.MONGODB_URI ?? '',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'redis',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  idempotency: {
    ttlSeconds: parseInt(process.env.IDEMPOTENCY_TTL_SECONDS ?? '86400', 10),
  },
  retry: {
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS ?? '3', 10),
  },
});
