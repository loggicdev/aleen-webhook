/**
 * Tipos para o sistema de mensagens processadas
 */

export interface ProcessedMessage {
  id: string;
  userId: string;
  userNumber: string;
  userName: string;
  messageType: MessageType;
  content: string;
  timestamp: number;
  instanceId: string;
  source: 'ios' | 'android' | 'web';
  redisKey: string;
}

export interface UserData {
  number: string;
  name: string;
  isClient: boolean;
  redisKey: string;
}

export interface AgentResponse {
  success: boolean;
  response?: string;
  error?: string;
  agentType: AgentType;
  webhookUrl?: string;
}

export type MessageType = 
  | 'text' 
  | 'audio' 
  | 'image' 
  | 'video' 
  | 'document'
  | 'unsupported';

export type AgentType = 
  | 'receptionist' 
  | 'financial' 
  | 'personal' 
  | 'nutritionist';

export type UserIntent = 
  | 'greeting' 
  | 'purchase' 
  | 'doubt' 
  | 'out_context';

export interface IntentClassification {
  intent: UserIntent;
  confidence: number;
  reasoning?: string;
}

export interface ConversationMemory {
  userId: string;
  messages: string[];
  lastActivity: number;
  context: Record<string, any>;
}
