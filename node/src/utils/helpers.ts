import { v4 as uuidv4 } from 'uuid';
import { MessageData, ProcessedMessage, ProcessedMessageType, UserData } from '../types';

/**
 * Extrai o número do usuário do remoteJid
 */
export function extractUserNumber(remoteJid: string): string {
  return remoteJid.split('@')[0];
}

/**
 * Gera uma chave Redis única para o usuário
 */
export function generateRedisKey(userNumber: string, instance: string = 'aleen'): string {
  return `${userNumber}${instance}`;
}

/**
 * Determina o tipo de mensagem baseado no objeto message
 */
export function determineMessageType(message: any): ProcessedMessageType {
  if (message.conversation) return 'text';
  if (message.audioMessage) return 'audio';
  if (message.imageMessage) return 'image';
  if (message.videoMessage) return 'video';
  if (message.documentMessage) return 'document';
  return 'unsupported';
}

/**
 * Extrai o conteúdo da mensagem baseado no tipo
 */
export function extractMessageContent(message: any, messageType: ProcessedMessageType): string {
  switch (messageType) {
    case 'text':
      return message.conversation || '';
    case 'audio':
      return message.audioMessage?.url || '';
    case 'image':
      return message.imageMessage?.caption || message.imageMessage?.url || '';
    case 'video':
      return message.videoMessage?.caption || message.videoMessage?.url || '';
    case 'document':
      return message.documentMessage?.title || message.documentMessage?.url || '';
    default:
      return '';
  }
}

/**
 * Converte dados do webhook em mensagem processada
 */
export function parseWebhookToMessage(data: MessageData): ProcessedMessage {
  const userNumber = extractUserNumber(data.key.remoteJid);
  const messageType = determineMessageType(data.message);
  const content = extractMessageContent(data.message, messageType);
  
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
    redisKey: generateRedisKey(userNumber),
  };
}

/**
 * Cria dados do usuário a partir da mensagem
 */
export function createUserData(message: ProcessedMessage): UserData {
  return {
    number: message.userNumber,
    name: message.userName,
    isClient: false, // Será determinado posteriormente
    redisKey: message.redisKey,
  };
}

/**
 * Valida se uma mensagem é válida para processamento
 */
export function isValidMessage(messageType: ProcessedMessageType): boolean {
  return messageType !== 'unsupported';
}

/**
 * Gera timestamp atual
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Formata timestamp para data legível
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}
