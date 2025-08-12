/**
 * Tipos para o sistema de webhook da Evolution API
 */

export interface EvolutionWebhookPayload {
  headers: {
    host: string;
    'user-agent': string;
    'content-length': string;
    'accept-encoding': string;
    'content-type': string;
    'x-forwarded-for': string;
    'x-forwarded-host': string;
    'x-forwarded-port': string;
    'x-forwarded-proto'?: string;
    'x-forwarded-server'?: string;
    'x-real-ip': string;
  };
  params: Record<string, any>;
  query: Record<string, any>;
  body: EvolutionWebhookBody;
  webhookUrl: string;
  executionMode: 'production' | 'development';
}

export interface EvolutionWebhookBody {
  event: string;
  instance: string;
  data: MessageData;
  destination: string;
  date_time: string;
  sender: string;
  server_url: string;
  apikey: string;
}

export interface MessageData {
  key: MessageKey;
  pushName: string;
  message: Message;
  messageType: MessageType;
  messageTimestamp: number;
  instanceId: string;
  source: 'ios' | 'android' | 'web';
}

export interface MessageKey {
  remoteJid: string;
  fromMe: boolean;
  id: string;
}

export interface Message {
  conversation?: string;
  audioMessage?: AudioMessage;
  imageMessage?: ImageMessage;
  videoMessage?: VideoMessage;
  documentMessage?: DocumentMessage;
  messageContextInfo?: MessageContextInfo;
}

export interface AudioMessage {
  url: string;
  mimetype: string;
  fileSha256: string;
  fileLength: number;
  seconds: number;
  ptt: boolean;
}

export interface ImageMessage {
  url: string;
  mimetype: string;
  caption?: string;
  fileSha256: string;
  fileLength: number;
  height: number;
  width: number;
}

export interface VideoMessage {
  url: string;
  mimetype: string;
  caption?: string;
  fileSha256: string;
  fileLength: number;
  seconds: number;
  height: number;
  width: number;
}

export interface DocumentMessage {
  url: string;
  mimetype: string;
  title: string;
  fileSha256: string;
  fileLength: number;
  pageCount?: number;
}

export interface MessageContextInfo {
  deviceListMetadata: {
    senderKeyHash: string;
    senderTimestamp: string;
    recipientKeyHash: string;
    recipientTimestamp: string;
  };
  deviceListMetadataVersion: number;
  messageSecret: string;
}

export type MessageType = 
  | 'conversation' 
  | 'audioMessage' 
  | 'imageMessage' 
  | 'videoMessage' 
  | 'documentMessage'
  | 'extendedTextMessage';
