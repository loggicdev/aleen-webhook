import { Request, Response } from 'express';
import { EvolutionWebhookPayload } from '../types';
import { MessageProcessorService } from '../services';
import { RedisMessageService } from '../services/redis-message.service';
import logger from '../utils/logger';

/**
 * Controller para processar webhooks da Evolution API
 */
export class WebhookController {
  
  /**
   * Endpoint principal para receber webhooks
   */
  public async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Cria o payload no formato esperado pelo service
      const payload: EvolutionWebhookPayload = {
        headers: req.headers as any,
        params: req.params,
        query: req.query,
        body: req.body,
        webhookUrl: req.body.webhookUrl || '',
        executionMode: req.body.executionMode || 'production'
      };
      
      logger.info('Webhook received', {
        event: req.body.event,
        instance: req.body.instance,
        messageType: req.body.data.messageType,
        userNumber: req.body.data.key.remoteJid,
        userName: req.body.data.pushName
      });

      // Processa a mensagem usando o MessageProcessorService
      const result = await MessageProcessorService.processWebhook(payload);

      if (!result.success) {
        logger.error('Failed to process webhook', {
          error: result.error,
          payload: payload.body
        });
        
        res.status(500).json({
          success: false,
          error: 'Failed to process webhook'
        });
        return;
      }

      // Se a mensagem foi ignorada (enviada pelo bot)
      if (result.route === 'ignored') {
        logger.debug('Message ignored (sent by bot)');
        
        res.status(200).json({
          success: true,
          message: 'Message ignored (sent by bot)'
        });
        return;
      }

      // Log do resultado do processamento
      logger.info('Message processed successfully', {
        route: result.route,
        messageId: result.processedMessage?.id,
        messageType: result.processedMessage?.messageType,
        userNumber: result.processedMessage?.userNumber,
        userName: result.processedMessage?.userName,
        redisKey: result.processedMessage?.redisKey,
        nextAction: MessageProcessorService.getNextAction(result.route)
      });

      // Determina a próxima ação baseada na rota
      const nextAction = MessageProcessorService.getNextAction(result.route);

      // TODO: Implementar as ações específicas baseadas na rota
      switch (result.route) {
        case 'audio':
          // TODO: Implementar download e transcrição de áudio
          logger.info('Audio message detected - needs transcription', {
            messageId: result.processedMessage?.id,
            audioUrl: result.processedMessage?.content
          });
          
          // Por enquanto, simula a transcrição para testar o fluxo completo
          await this.handleAudioMessage(payload, "Texto transcrito simulado do áudio");
          break;
          
        case 'texto':
          // Processa mensagem de texto usando o novo sistema
          await this.handleTextMessage(payload);
          break;
          
        case 'image':
          // TODO: Implementar download e análise de imagem
          logger.info('Image message detected - needs analysis', {
            messageId: result.processedMessage?.id,
            imageUrl: result.processedMessage?.content
          });
          break;
          
        case 'video':
          // TODO: Implementar download e análise de vídeo
          logger.info('Video message detected - needs analysis', {
            messageId: result.processedMessage?.id,
            videoUrl: result.processedMessage?.content
          });
          break;
          
        case 'file':
          // TODO: Implementar download de documento
          logger.info('Document message detected - needs download', {
            messageId: result.processedMessage?.id,
            documentUrl: result.processedMessage?.content
          });
          break;
          
        case 'extra':
          // TODO: Enviar mensagem de erro para tipo não suportado
          logger.warn('Unsupported message type - will send error message', {
            messageId: result.processedMessage?.id,
            originalType: payload.body.data.messageType
          });
          
          await this.handleUnsupportedMessage(payload);
          break;
      }

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        data: {
          route: result.route,
          messageId: result.processedMessage?.id,
          messageType: result.processedMessage?.messageType,
          userNumber: result.processedMessage?.userNumber,
          nextAction: nextAction.action,
          actionDescription: nextAction.description
        }
      });

    } catch (error) {
      logger.error('Error processing webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Health check endpoint
   */
  public async healthCheck(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'Aleen IA is running',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  }

  /**
   * Endpoint para teste
   */
  public async test(req: Request, res: Response): Promise<void> {
    logger.info('Test endpoint called', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({
      success: true,
      message: 'Test endpoint working',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Processa mensagens de texto seguindo o fluxo do N8N
   */
  private async handleTextMessage(payload: EvolutionWebhookPayload): Promise<void> {
    try {
      // 1. Criar dados de entrada para texto
      const processedData = MessageProcessorService.processTextMessage(payload);
      
      // 2. Processar fluxo de mensagens Redis
      const redisResult = await RedisMessageService.processMessageFlow(processedData);
      
      if (redisResult.shouldProceed) {
        logger.info('Text message ready for AI processing', {
          userNumber: processedData.number,
          userName: processedData.nome,
          aggregatedMessage: redisResult.aggregatedMessage?.substring(0, 100) + '...'
        });
        
        // TODO: Aqui vai a lógica de verificação de usuário e classificação de necessidade
        // Por enquanto apenas logga que chegou até aqui
        logger.info('Next step: verifyUser and classify user needs', {
          redisKey: processedData.chaveRedis
        });
      }
      
    } catch (error) {
      logger.error('Error handling text message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userNumber: payload.body.data.key.remoteJid
      });
    }
  }

  /**
   * Processa mensagens de áudio seguindo o fluxo do N8N
   */
  private async handleAudioMessage(payload: EvolutionWebhookPayload, transcribedText: string): Promise<void> {
    try {
      // 1. Criar dados de entrada para áudio
      const processedData = MessageProcessorService.processAudioMessage(payload, transcribedText);
      
      // 2. Processar fluxo de mensagens Redis
      const redisResult = await RedisMessageService.processMessageFlow(processedData);
      
      if (redisResult.shouldProceed) {
        logger.info('Audio message ready for AI processing', {
          userNumber: processedData.number,
          userName: processedData.nome,
          transcribedText: transcribedText.substring(0, 100) + '...',
          aggregatedMessage: redisResult.aggregatedMessage?.substring(0, 100) + '...'
        });
        
        // TODO: Aqui vai a lógica de verificação de usuário e classificação de necessidade
        // Por enquanto apenas logga que chegou até aqui
        logger.info('Next step: verifyUser and classify user needs', {
          redisKey: processedData.chaveRedis
        });
      }
      
    } catch (error) {
      logger.error('Error handling audio message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userNumber: payload.body.data.key.remoteJid
      });
    }
  }

  /**
   * Processa mensagens não suportadas (equivale ao fluxo "extra" do N8N)
   */
  private async handleUnsupportedMessage(payload: EvolutionWebhookPayload): Promise<void> {
    try {
      logger.info('Handling unsupported message type', {
        messageType: payload.body.data.messageType,
        userNumber: payload.body.data.key.remoteJid
      });
      
      // TODO: Implementar envio de mensagem de erro
      // Por enquanto apenas logga
      logger.info('Should send error message to user', {
        userNumber: payload.body.data.key.remoteJid.split('@')[0],
        messageType: payload.body.data.messageType
      });
      
    } catch (error) {
      logger.error('Error handling unsupported message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userNumber: payload.body.data.key.remoteJid
      });
    }
  }
}
