import dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

interface Config {
  app: {
    port: number;
    env: string;
  };
  openai: {
    apiKey: string;
  };
  evolution: {
    apiKey: string;
    baseUrl: string;
    instance: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  webhooks: {
    secret: string;
    onboarding: string;
    greeting: string;
    doubt: string;
    outContext: string;
    verifyUser: string;
  };
  logging: {
    level: string;
    format: string;
  };
}

const config: Config = {
  app: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  evolution: {
    apiKey: process.env.EVOLUTION_API_KEY || '',
    baseUrl: process.env.EVOLUTION_API_BASE_URL || '',
    instance: process.env.EVOLUTION_INSTANCE || 'aleen',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  webhooks: {
    secret: process.env.WEBHOOK_SECRET || '',
    onboarding: process.env.ONBOARDING_WEBHOOK_URL || '',
    greeting: process.env.GREETING_WEBHOOK_URL || '',
    doubt: process.env.DOUBT_WEBHOOK_URL || '',
    outContext: process.env.OUT_CONTEXT_WEBHOOK_URL || '',
    verifyUser: process.env.VERIFY_USER_WEBHOOK_URL || '',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
};

export default config;
