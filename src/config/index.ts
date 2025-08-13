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
    username?: string;
    password?: string;
    db: number;
    url?: string; // Connection string completa
  };
  pythonAi: {
    baseUrl: string;
  };
  webhooks: {
    secret: string;
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
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    url: process.env.REDIS_URL || undefined, // Connection string completa
  },
  pythonAi: {
    baseUrl: process.env.PYTHON_AI_URL || 'http://localhost:8000',
  },
  webhooks: {
    secret: process.env.WEBHOOK_SECRET || '',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
};

export default config;
