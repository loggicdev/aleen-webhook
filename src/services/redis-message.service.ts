import { InputData } from '../types/input-data.types';
import logger from '../utils/logger';
import RedisClient from '../utils/redis';

/**
 * Service para gerenciar operações Redis seguindo a lógica do N8N
 * Equivale aos nodes: listarMensagens, buscaMensagens, limparRedis
 */
export class RedisMessageService {
  // Timeout para aguardar novas mensagens (10 segundos)
  private static readonly MESSAGE_TIMEOUT = 10000;
  
  // Map para controlar timeouts por chave Redis
  private static timeouts = new Map<string, NodeJS.Timeout>();
  
  // Map para controlar se há processamento em andamento
  private static processing = new Map<string, boolean>();
  
  // Map para armazenar resolvers de Promises pendentes
  private static pendingResolvers = new Map<string, Array<(result: { shouldProceed: boolean; aggregatedMessage?: string }) => void>>();
  
  /**
   * Adiciona mensagem à lista no Redis (equivale ao node "listarMensagens")
   * Operation: push, tail: true
   */
  public static async pushMessage(inputData: InputData): Promise<void> {
    try {
      const redis = await RedisClient.getInstance();
      
      logger.info('Pushing message to Redis list', {
        redisKey: inputData.chaveRedis,
        message: inputData.message.substring(0, 100) + '...',
        userNumber: inputData.number,
        userName: inputData.nome
      });

      // Adiciona mensagem à lista (rPush = adiciona no final)
      await redis.rpush(inputData.chaveRedis, inputData.message);
      
      logger.info('Message pushed successfully to Redis', {
        redisKey: inputData.chaveRedis
      });
      
    } catch (error) {
      logger.error('Error pushing message to Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        redisKey: inputData.chaveRedis
      });
      throw error;
    }
  }

  /**
   * Busca todas as mensagens da lista no Redis (equivale ao node "buscaMensagens")
   * Operation: get, propertyName: "message"
   */
  public static async getMessages(redisKey: string): Promise<string[]> {
    try {
      const redis = await RedisClient.getInstance();
      
      logger.info('Getting messages from Redis list', { redisKey });

      // Busca todas as mensagens da lista (lRange 0 -1 = todas)
      const messages = await redis.lrange(redisKey, 0, -1);
      
      logger.info('Messages retrieved from Redis', {
        redisKey,
        messageCount: messages.length
      });
      
      return messages;
      
    } catch (error) {
      logger.error('Error getting messages from Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        redisKey
      });
      throw error;
    }
  }

  /**
   * Agrega todas as mensagens em uma string (equivale ao node "mensagensAgregadas")
   * Junta as mensagens com '\n'
   */
  public static async aggregateMessages(redisKey: string): Promise<string> {
    try {
      const messages = await this.getMessages(redisKey);
      const aggregatedMessage = messages.join('\n');
      
      logger.info('Messages aggregated', {
        redisKey,
        messageCount: messages.length,
        aggregatedLength: aggregatedMessage.length
      });
      
      return aggregatedMessage;
      
    } catch (error) {
      logger.error('Error aggregating messages', {
        error: error instanceof Error ? error.message : 'Unknown error',
        redisKey
      });
      throw error;
    }
  }

  /**
   * Remove a chave do Redis (equivale ao node "limparRedis")
   * Operation: delete
   */
  public static async clearMessages(redisKey: string): Promise<void> {
    try {
      const redis = await RedisClient.getInstance();
      
      logger.info('Clearing Redis key', { redisKey });

      // Remove a chave do Redis
      await redis.del(redisKey);
      
      logger.info('Redis key cleared successfully', { redisKey });
      
    } catch (error) {
      logger.error('Error clearing Redis key', {
        error: error instanceof Error ? error.message : 'Unknown error',
        redisKey
      });
      throw error;
    }
  }

  /**
   * Processa o fluxo completo de mensagens Redis seguindo a lógica do N8N
   * Com sistema de delay para aguardar novas mensagens
   */
  public static async processMessageFlow(inputData: InputData): Promise<{
    shouldProceed: boolean;
    aggregatedMessage?: string;
  }> {
    try {
      const redisKey = inputData.chaveRedis;

      // Verifica se já está processando esta chave
      if (this.processing.get(redisKey)) {
        logger.info('Already processing messages for this key, adding to queue', { redisKey });
        return this.waitForProcessing(redisKey);
      }

      // 1. Adiciona mensagem à lista
      await this.pushMessage(inputData);

      // 2. Cancela timeout anterior se existir e resolve todas as Promises pendentes
      const existingTimeout = this.timeouts.get(redisKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        logger.info('Cancelled previous timeout, new message received', { redisKey });
      }

      // 3. Cria novo timeout de 10 segundos
      return new Promise((resolve) => {
        // Adiciona resolver à lista de pendentes
        if (!this.pendingResolvers.has(redisKey)) {
          this.pendingResolvers.set(redisKey, []);
        }
        this.pendingResolvers.get(redisKey)!.push(resolve);

        const timeout = setTimeout(async () => {
          try {
            // Marca como processando
            this.processing.set(redisKey, true);

            logger.info('Timeout reached, processing aggregated messages', { 
              redisKey, 
              timeoutMs: this.MESSAGE_TIMEOUT 
            });

            // 4. Busca todas as mensagens
            const messages = await this.getMessages(redisKey);

            if (messages.length === 0) {
              logger.warn('No messages found in Redis list', { redisKey });
              this.resolveAllPending(redisKey, { shouldProceed: false });
              return;
            }

            // 5. Agrega mensagens
            const aggregatedMessage = await this.aggregateMessages(redisKey);

            // 6. Limpa Redis
            await this.clearMessages(redisKey);

            logger.info('Message aggregation completed successfully', {
              redisKey,
              totalMessages: messages.length,
              aggregatedLength: aggregatedMessage.length
            });

            // Resolve todas as Promises pendentes
            this.resolveAllPending(redisKey, {
              shouldProceed: true,
              aggregatedMessage
            });

          } catch (error) {
            logger.error('Error processing message timeout', {
              error: error instanceof Error ? error.message : 'Unknown error',
              redisKey
            });

            // Resolve todas as Promises pendentes com erro
            this.resolveAllPending(redisKey, { shouldProceed: false });
          }
        }, this.MESSAGE_TIMEOUT);

        // Salva o timeout
        this.timeouts.set(redisKey, timeout);

        logger.info('Started message aggregation timer', {
          redisKey,
          timeoutMs: this.MESSAGE_TIMEOUT,
          message: inputData.message.substring(0, 50) + '...'
        });
      });
      
    } catch (error) {
      logger.error('Error in message flow processing', {
        error: error instanceof Error ? error.message : 'Unknown error',
        redisKey: inputData.chaveRedis
      });
      
      // Resolve todas as Promises pendentes com erro
      this.resolveAllPending(inputData.chaveRedis, { shouldProceed: false });
      
      throw error;
    }
  }

  /**
   * Resolve todas as Promises pendentes para uma chave específica
   */
  private static resolveAllPending(redisKey: string, result: { shouldProceed: boolean; aggregatedMessage?: string }): void {
    const resolvers = this.pendingResolvers.get(redisKey);
    if (resolvers) {
      resolvers.forEach(resolve => resolve(result));
      this.pendingResolvers.delete(redisKey);
    }
    
    // Limpa controles
    this.processing.delete(redisKey);
    this.timeouts.delete(redisKey);
  }

  /**
   * Aguarda o processamento em andamento para uma chave específica
   */
  private static async waitForProcessing(redisKey: string): Promise<{ shouldProceed: boolean; aggregatedMessage?: string }> {
    return new Promise((resolve) => {
      if (!this.pendingResolvers.has(redisKey)) {
        this.pendingResolvers.set(redisKey, []);
      }
      this.pendingResolvers.get(redisKey)!.push(resolve);
    });
  }

  /**
   * Simula o aguardo por novas mensagens (equivale ao node "aguardaNovasMensagens")
   * No N8N há um wait sem parâmetros, aqui usamos um delay mínimo
   */
  private static async waitForNewMessages(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, 100); // 100ms delay
    });
  }

  /**
   * Cancela o timeout para uma chave específica (para testes ou cleanup)
   */
  public static cancelTimeout(redisKey: string): void {
    const timeout = this.timeouts.get(redisKey);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(redisKey);
      this.processing.delete(redisKey);
      logger.info('Timeout cancelled for key', { redisKey });
    }
  }

  /**
   * Obtém estatísticas dos timeouts ativos
   */
  public static getActiveTimeouts(): { redisKey: string; isProcessing: boolean }[] {
    const active: { redisKey: string; isProcessing: boolean }[] = [];
    
    for (const [redisKey] of this.timeouts) {
      active.push({
        redisKey,
        isProcessing: this.processing.get(redisKey) || false
      });
    }
    
    return active;
  }

  /**
   * Força o processamento imediato de uma chave (para testes)
   */
  public static async forceProcess(redisKey: string): Promise<{
    shouldProceed: boolean;
    aggregatedMessage?: string;
  }> {
    try {
      // Cancela timeout se existir
      this.cancelTimeout(redisKey);

      // Marca como processando
      this.processing.set(redisKey, true);

      // Busca mensagens
      const messages = await this.getMessages(redisKey);

      if (messages.length === 0) {
        this.processing.delete(redisKey);
        return { shouldProceed: false };
      }

      // Agrega e limpa
      const aggregatedMessage = await this.aggregateMessages(redisKey);
      await this.clearMessages(redisKey);

      // Limpa controles
      this.processing.delete(redisKey);

      return {
        shouldProceed: true,
        aggregatedMessage
      };

    } catch (error) {
      this.processing.delete(redisKey);
      throw error;
    }
  }
}
