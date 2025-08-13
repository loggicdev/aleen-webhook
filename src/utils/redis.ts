import Redis from 'ioredis';
import config from '../config';
import logger from './logger';

/**
 * Cliente Redis singleton para gerenciar conexões
 */
class RedisClient {
  private static instance: Redis | null = null;
  private static connecting = false;

  /**
   * Obtém a instância do Redis (singleton)
   */
  public static async getInstance(): Promise<Redis> {
    if (this.instance && this.instance.status === 'ready') {
      return this.instance;
    }

    if (this.connecting) {
      // Aguarda a conexão em andamento
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.getInstance();
    }

    this.connecting = true;

    try {
      // Debug da configuração Redis
      logger.info('Redis configuration debug', {
        hasUrl: !!config.redis.url,
        redisUrl: config.redis.url ? config.redis.url.replace(/:([^:@]+)@/, ':***@') : null,
        host: config.redis.host,
        port: config.redis.port,
        hasPassword: !!config.redis.password,
        db: config.redis.db
      });

      // Se houver REDIS_URL, usar connection string
      if (config.redis.url) {
        logger.info('Using Redis connection string', {
          url: config.redis.url.replace(/:([^:@]+)@/, ':***@'), // Oculta password no log
          hasUrl: true
        });

        this.instance = new Redis(config.redis.url, {
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
          lazyConnect: true,
          connectTimeout: 60000,
          commandTimeout: 30000,
          family: 4, // Force IPv4
          keepAlive: 30000,
          tls: config.redis.url.startsWith('rediss://') ? {} : undefined
        });
      } else {
        // Fallback para configuração individual
        logger.info('Using Redis individual config (no URL found)', {
          host: config.redis.host,
          port: config.redis.port,
          hasPassword: !!config.redis.password,
          db: config.redis.db
        });

        this.instance = new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password || undefined,
          db: config.redis.db,
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
          lazyConnect: true,
          connectTimeout: 60000,
          commandTimeout: 30000,
          family: 4, // Force IPv4
          keepAlive: 30000
        });
      }

      // Event handlers
      this.instance.on('connect', () => {
        logger.info('Redis connecting...');
      });

      this.instance.on('ready', () => {
        logger.info('Redis connected successfully', {
          host: config.redis.host,
          port: config.redis.port,
          db: config.redis.db
        });
      });

      this.instance.on('error', (error: Error) => {
        logger.error('Redis connection error', {
          error: error.message,
          stack: error.stack
        });
      });

      this.instance.on('close', () => {
        logger.warn('Redis connection closed');
      });

      this.instance.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      // Conecta ao Redis
      await this.instance.connect();
      
      this.connecting = false;
      return this.instance;

    } catch (error) {
      this.connecting = false;
      logger.error('Failed to connect to Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        host: config.redis.host,
        port: config.redis.port
      });
      throw error;
    }
  }

  /**
   * Fecha a conexão Redis
   */
  public static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      this.instance = null;
      logger.info('Redis disconnected');
    }
  }

  /**
   * Verifica se está conectado
   */
  public static isConnected(): boolean {
    return this.instance?.status === 'ready';
  }
}

export default RedisClient;
