import { EvolutionWebhookPayload, ProcessedMessage, ProcessedMessageType } from '../types';
import { MessageTypeService } from './message-type.service';
import { InputDataService } from './input-data.service';
import { InputData, ProcessedInputData } from '../types/input-data.types';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service para processar mensagens seguindo a lógica do N8N
 */
export class MessageProcessorService {
  private static inputDataService = new InputDataService();

  /**
   * Processa mensagens de texto (equivalente ao node "dadosComTexto")
   */
  public static processTextMessage(payload: EvolutionWebhookPayload): ProcessedInputData {
    try {
      const textData = this.inputDataService.createTextData(payload);
      const processedData = this.inputDataService.processInputData(textData, 'text');
      
      logger.info('Text message processed successfully', {
        userNumber: processedData.number,
        userName: processedData.nome,
        redisKey: processedData.chaveRedis,
        messageLength: processedData.message.length
      });
      
      return processedData;
    } catch (error) {
      logger.error('Error processing text message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        payload: payload.body.data.key.id
      });
      throw error;
    }
  }

  /**
   * Processa mensagens de áudio (equivalente ao node "dadosComAudio")
   * Requer o texto transcrito como parâmetro
   */
  public static processAudioMessage(payload: EvolutionWebhookPayload, transcribedText: string): ProcessedInputData {
    try {
      const audioData = this.inputDataService.createAudioData(payload, transcribedText);
      const processedData = this.inputDataService.processInputData(audioData, 'audio');
      
      logger.info('Audio message processed successfully', {
        userNumber: processedData.number,
        userName: processedData.nome,
        redisKey: processedData.chaveRedis,
        transcribedLength: transcribedText.length
      });
      
      return processedData;
    } catch (error) {
      logger.error('Error processing audio message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        payload: payload.body.data.key.id
      });
      throw error;
    }
  }
  public static async processWebhook(payload: EvolutionWebhookPayload): Promise<{
    success: boolean;
    route: string;
    processedMessage?: ProcessedMessage;
    error?: string;
  }> {
    try {
      const { data } = payload.body;

      // Ignora mensagens enviadas pelo próprio bot
      if (data.key.fromMe) {
        return {
          success: true,
          route: 'ignored',
        };
      }

      // Determina o tipo de mensagem usando o service
      const messageType = MessageTypeService.determineMessageType(data.messageType);
      const route = MessageTypeService.getRouteOutput(messageType);

      logger.info('Message type determined', {
        originalType: data.messageType,
        processedType: messageType,
        route,
        messageId: data.key.id,
        userNumber: this.extractUserNumber(data.key.remoteJid)
      });

      // Se for tipo não suportado, retorna para rota "extra"
      if (!MessageTypeService.isSupportedMessageType(messageType)) {
        logger.warn('Unsupported message type', {
          messageType: data.messageType,
          route,
          userNumber: this.extractUserNumber(data.key.remoteJid)
        });

        return {
          success: true,
          route: 'extra', // Equivale ao fallback do N8N
          processedMessage: this.createProcessedMessage(data, messageType)
        };
      }

      // Cria a mensagem processada
      const processedMessage = this.createProcessedMessage(data, messageType);

      // Verifica se precisa de processamento especial
      const processingInfo = MessageTypeService.getProcessingInfo(messageType);
      
      if (processingInfo.needsDownload || processingInfo.needsTranscription) {
        logger.info('Message requires special processing', {
          messageId: processedMessage.id,
          messageType,
          needsDownload: processingInfo.needsDownload,
          needsTranscription: processingInfo.needsTranscription
        });
      }

      return {
        success: true,
        route,
        processedMessage
      };

    } catch (error) {
      logger.error('Error processing webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        success: false,
        route: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Cria uma mensagem processada a partir dos dados do webhook
   */
  private static createProcessedMessage(data: any, messageType: ProcessedMessageType): ProcessedMessage {
    const userNumber = this.extractUserNumber(data.key.remoteJid);
    const content = MessageTypeService.extractMessageContent(data.message, messageType);

    return {
      id: uuidv4(),
      userId: data.key.id,
      userNumber,
      userName: data.pushName,
      messageType,
      content,
      timestamp: data.messageTimestamp,
      instanceId: data.instanceId,
      source: data.source,
      redisKey: this.generateRedisKey(userNumber, data.pushName)
    };
  }

  /**
   * Extrai o número do usuário do remoteJid
   */
  private static extractUserNumber(remoteJid: string): string {
    return remoteJid.split('@')[0];
  }

  /**
   * Gera a chave Redis seguindo o padrão do N8N
   * Formato: {number}{firstName}{lastName}aleen
   */
  private static generateRedisKey(userNumber: string, pushName: string): string {
    const nameParts = pushName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts[nameParts.length - 1] || '';
    
    // Se só tem um nome, lastName será igual ao firstName
    const finalLastName = nameParts.length > 1 ? lastName : '';
    
    return `${userNumber}${firstName}${finalLastName}aleen`;
  }

  /**
   * Determina o próximo passo baseado na rota
   */
  public static getNextAction(route: string): {
    action: string;
    description: string;
  } {
    switch (route) {
      case 'audio':
        return {
          action: 'download_and_transcribe',
          description: 'Download audio file and transcribe using OpenAI Whisper'
        };
      
      case 'texto':
        return {
          action: 'process_text',
          description: 'Process text message directly'
        };
      
      case 'image':
        return {
          action: 'download_and_analyze',
          description: 'Download image and analyze content'
        };
      
      case 'video':
        return {
          action: 'download_and_analyze',
          description: 'Download video and analyze content'
        };
      
      case 'file':
        return {
          action: 'download_document',
          description: 'Download and process document'
        };
      
      case 'extra':
        return {
          action: 'send_unsupported_message',
          description: 'Send error message for unsupported type'
        };
      
      default:
        return {
          action: 'unknown',
          description: 'Unknown action required'
        };
    }
  }
}
