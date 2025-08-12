import { EvolutionWebhookPayload } from '../types/webhook.types';
import { InputData, AudioData, TextData, ProcessedInputData } from '../types/input-data.types';
import logger from '../utils/logger';

export class InputDataService {
  /**
   * Gera a chave Redis baseada nos dados do webhook
   * Formato: {number}{primeiroNome}{ultimoNome}aleen
   */
  private generateRedisKey(payload: EvolutionWebhookPayload): string {
    const number = payload.body.data.key.remoteJid.split('@')[0];
    const pushName = payload.body.data.pushName || '';
    const nameParts = pushName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts[nameParts.length - 1] || '';
    
    const redisKey = `${number}${firstName}${lastName}aleen`;
    
    logger.info('Generated Redis key', {
      number,
      pushName,
      firstName,
      lastName,
      redisKey
    });
    
    return redisKey;
  }

  /**
   * Extrai o número do telefone do payload
   */
  private extractPhoneNumber(payload: EvolutionWebhookPayload): string {
    return payload.body.data.key.remoteJid.split('@')[0];
  }

  /**
   * Cria dados de entrada para mensagens de texto
   */
  createTextData(payload: EvolutionWebhookPayload): TextData {
    const number = this.extractPhoneNumber(payload);
    const nome = payload.body.data.pushName || '';
    const originalText = payload.body.data.message.conversation || '';
    const chaveRedis = this.generateRedisKey(payload);

    const textData: TextData = {
      number,
      message: originalText,
      nome,
      chaveRedis,
      originalText
    };

    logger.info('Created text data', { textData });
    
    return textData;
  }

  /**
   * Cria dados de entrada para mensagens de áudio (após transcrição)
   */
  createAudioData(payload: EvolutionWebhookPayload, transcribedText: string): AudioData {
    const number = this.extractPhoneNumber(payload);
    const nome = payload.body.data.pushName || '';
    const chaveRedis = this.generateRedisKey(payload);

    const audioData: AudioData = {
      number,
      message: transcribedText,
      nome,
      chaveRedis,
      transcribedText
    };

    logger.info('Created audio data', { 
      audioData: { ...audioData, transcribedText: transcribedText.substring(0, 100) + '...' }
    });
    
    return audioData;
  }

  /**
   * Processa e padroniza os dados de entrada (equivalente ao node "dadosEntrada")
   */
  processInputData(data: AudioData | TextData, messageType: 'audio' | 'text'): ProcessedInputData {
    const processedData: ProcessedInputData = {
      number: data.number,
      message: data.message,
      nome: data.nome,
      chaveRedis: data.chaveRedis,
      messageType,
      originalData: data
    };

    logger.info('Processed input data', {
      processedData: {
        number: processedData.number,
        nome: processedData.nome,
        chaveRedis: processedData.chaveRedis,
        messageType: processedData.messageType,
        messageLength: processedData.message.length
      }
    });

    return processedData;
  }

  /**
   * Agrupa dados de entrada (equivalente ao node "agruparDadosEntrada")
   * Esta função seria chamada quando dados de texto e áudio precisam ser merged
   */
  mergeInputData(audioData?: AudioData, textData?: TextData): InputData {
    // Prioriza dados de áudio se disponível, senão usa dados de texto
    const primaryData = audioData || textData;
    
    if (!primaryData) {
      throw new Error('No input data provided for merging');
    }

    const mergedData: InputData = {
      number: primaryData.number,
      message: primaryData.message,
      nome: primaryData.nome,
      chaveRedis: primaryData.chaveRedis
    };

    logger.info('Merged input data', {
      mergedData,
      sourceType: audioData ? 'audio' : 'text'
    });

    return mergedData;
  }

  /**
   * Valida se os dados de entrada estão completos
   */
  validateInputData(data: InputData): boolean {
    const isValid = !!(data.number && data.nome && data.chaveRedis);
    
    if (!isValid) {
      logger.warn('Invalid input data', { data });
    }
    
    return isValid;
  }
}
