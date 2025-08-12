import { ProcessedMessageType } from '../types';

/**
 * Service para classificar tipos de mensagem baseado no N8N switch
 */
export class MessageTypeService {
  
  /**
   * Determina o tipo de mensagem baseado no messageType da Evolution API
   */
  public static determineMessageType(messageType: string): ProcessedMessageType {
    switch (messageType) {
      case 'audioMessage':
        return 'audio';
      case 'conversation':
        return 'text';
      case 'imageMessage':
        return 'image';
      case 'videoMessage':
        return 'video';
      case 'documentMessage':
      case 'file':
        return 'document';
      default:
        return 'unsupported';
    }
  }

  /**
   * Verifica se o tipo de mensagem é suportado
   */
  public static isSupportedMessageType(messageType: ProcessedMessageType): boolean {
    const supportedTypes: ProcessedMessageType[] = ['text', 'audio', 'image', 'video', 'document'];
    return supportedTypes.includes(messageType);
  }

  /**
   * Retorna o nome da rota/output baseado no tipo (como no N8N)
   */
  public static getRouteOutput(messageType: ProcessedMessageType): string {
    switch (messageType) {
      case 'audio':
        return 'audio';
      case 'text':
        return 'texto';
      case 'image':
        return 'image';
      case 'video':
        return 'video';
      case 'document':
        return 'file';
      default:
        return 'extra'; // fallback como no N8N
    }
  }

  /**
   * Extrai o conteúdo da mensagem baseado no tipo
   */
  public static extractMessageContent(message: any, messageType: ProcessedMessageType): string {
    switch (messageType) {
      case 'text':
        return message.conversation || '';
      
      case 'audio':
        // Para áudio, retornamos a URL que será transcrita depois
        return message.audioMessage?.url || '';
      
      case 'image':
        // Para imagem, pegamos caption ou URL
        return message.imageMessage?.caption || message.imageMessage?.url || '';
      
      case 'video':
        // Para vídeo, pegamos caption ou URL
        return message.videoMessage?.caption || message.videoMessage?.url || '';
      
      case 'document':
        // Para documento, pegamos título ou URL
        return message.documentMessage?.title || message.documentMessage?.url || '';
      
      default:
        return '';
    }
  }

  /**
   * Verifica se a mensagem precisa de processamento especial (download, transcrição, etc.)
   */
  public static requiresSpecialProcessing(messageType: ProcessedMessageType): boolean {
    // Áudio precisa de transcrição, mídia precisa de download
    return ['audio', 'image', 'video', 'document'].includes(messageType);
  }

  /**
   * Retorna informações sobre o processamento necessário
   */
  public static getProcessingInfo(messageType: ProcessedMessageType): {
    needsDownload: boolean;
    needsTranscription: boolean;
    needsAnalysis: boolean;
  } {
    switch (messageType) {
      case 'audio':
        return {
          needsDownload: true,
          needsTranscription: true,
          needsAnalysis: false
        };
      
      case 'image':
        return {
          needsDownload: true,
          needsTranscription: false,
          needsAnalysis: true // Para análise de imagem futura
        };
      
      case 'video':
        return {
          needsDownload: true,
          needsTranscription: false,
          needsAnalysis: true
        };
      
      case 'document':
        return {
          needsDownload: true,
          needsTranscription: false,
          needsAnalysis: false
        };
      
      default:
        return {
          needsDownload: false,
          needsTranscription: false,
          needsAnalysis: false
        };
    }
  }
}
