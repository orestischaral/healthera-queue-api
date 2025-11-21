export default () => ({
  port: parseInt(process.env.PORT || '', 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  queueProvider: process.env.QUEUE_PROVIDER || 'bullmq',

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '', 10) || 6379,
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    retryAttempts: parseInt(process.env.RABBITMQ_RETRY_ATTEMPTS || '', 10) || 5,
    retryDelayMs:
      parseInt(process.env.RABBITMQ_RETRY_DELAY_MS || '', 10) || 1000,
  },
});
