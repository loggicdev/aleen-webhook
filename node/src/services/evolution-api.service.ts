import axios from 'axios';
import logger from '../utils/logger';

interface SendTextMessageRequest {
  number: string;
  text: string;  // Direto, não dentro de textMessage
}

interface SendTextMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  data?: any;
}

class EvolutionApiService {
  private baseUrl: string;
  private apiKey: string;
  private instance: string;

  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_BASE_URL || '';
    this.apiKey = process.env.EVOLUTION_API_KEY || '';
    this.instance = process.env.EVOLUTION_INSTANCE || '';

    if (!this.baseUrl || !this.apiKey || !this.instance) {
      logger.warn('Evolution API configuration incomplete', {
        hasBaseUrl: !!this.baseUrl,
        hasApiKey: !!this.apiKey,
        hasInstance: !!this.instance
      });
    }
  }

  private cleanPhoneNumber(phone: string): string {
    return phone.replace(/[^\d]/g, '');
  }

  private splitLongMessage(text: string, maxLength: number = 1000): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const messages: string[] = [];
    let currentMessage = '';
    const sentences = text.split(/(?<=[.!?])\s+/);

    for (const sentence of sentences) {
      if ((currentMessage + sentence).length <= maxLength) {
        currentMessage += (currentMessage ? ' ' : '') + sentence;
      } else {
        if (currentMessage) {
          messages.push(currentMessage.trim());
          currentMessage = sentence;
        } else {
          for (let i = 0; i < sentence.length; i += maxLength) {
            messages.push(sentence.substring(i, i + maxLength));
          }
        }
      }
    }

    if (currentMessage) {
      messages.push(currentMessage.trim());
    }

    return messages;
  }

  private async sendSingleMessage(
    cleanNumber: string,
    text: string,
    options: {
      delay?: number;
      presence?: 'composing' | 'recording' | 'paused';
      linkPreview?: boolean;
    }
  ): Promise<SendTextMessageResponse> {
    try {
      // Estrutura correta da Evolution API
      const payload = {
        number: cleanNumber,
        text: text  // Direto, não dentro de textMessage
      };

      const url = `${this.baseUrl}/message/sendText/${this.instance}`;

      logger.info('Sending WhatsApp message via Evolution API', {
        url,
        number: cleanNumber,
        textLength: text.length,
        instance: this.instance,
        payload: JSON.stringify(payload)
      });

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        },
        timeout: 30000
      });

      if (response.status === 200 || response.status === 201) {
        logger.info('WhatsApp message sent successfully', {
          number: cleanNumber,
          textLength: text.length,
          status: response.status,
          responseData: response.data
        });

        return {
          success: true,
          data: response.data
        };
      } else {
        logger.error('Evolution API returned non-success status', {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          number: cleanNumber
        });

        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      logger.error('Error in sendSingleMessage', {
        error: error instanceof Error ? error.message : 'Unknown error',
        number: cleanNumber,
        textLength: text.length,
        responseStatus: error && typeof error === 'object' && 'response' in error ? (error.response as any)?.status : undefined,
        responseData: error && typeof error === 'object' && 'response' in error ? (error.response as any)?.data : undefined
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async sendTextMessage(
    phoneNumber: string, 
    text: string,
    options: {
      delay?: number;
      presence?: 'composing' | 'recording' | 'paused';
      linkPreview?: boolean;
    } = {}
  ): Promise<SendTextMessageResponse> {
    try {
      const cleanNumber = this.cleanPhoneNumber(phoneNumber);
      const messages = this.splitLongMessage(text, 1000);
      
      if (messages.length === 1) {
        return await this.sendSingleMessage(cleanNumber, text, options);
      } else {
        logger.info('Splitting long message', {
          originalLength: text.length,
          parts: messages.length,
          number: cleanNumber
        });

        let lastResponse: SendTextMessageResponse = { success: false };
        
        for (let i = 0; i < messages.length; i++) {
          const messageText = messages[i];
          const partOptions = {
            ...options,
            delay: options.delay || 2000 + (i * 1000)
          };
          
          lastResponse = await this.sendSingleMessage(cleanNumber, messageText, partOptions);
          
          if (!lastResponse.success) {
            logger.error('Failed to send message part', {
              part: i + 1,
              total: messages.length,
              number: cleanNumber
            });
            break;
          }
          
          if (i < messages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
        
        return lastResponse;
      }
    } catch (error) {
      logger.error('Error sending WhatsApp message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        phoneNumber,
        textLength: text.length
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async sendWelcomeMessage(phoneNumber: string, userName: string = ''): Promise<SendTextMessageResponse> {
    const welcomeText = `Olá${userName ? ` ${userName}` : ''}! 👋

Eu sou a Aleen, sua assistente inteligente de fitness e nutrição! 🏋️‍♀️

Estou aqui para te ajudar a:
• Criar treinos personalizados ��
• Planejar sua alimentação 🥗
• Acompanhar seu progresso 📊
• Tirar dúvidas sobre saúde 💡

Vamos conversar e descobrir como posso te ajudar! 😊`;

    return this.sendTextMessage(phoneNumber, welcomeText, {
      delay: 2000,
      presence: 'composing'
    });
  }

  async sendAgentMessage(
    phoneNumber: string,
    agentResponse: string,
    agentType: string = 'onboarding'
  ): Promise<SendTextMessageResponse> {
    const delay = this.calculateTypingDelay(agentResponse);
    
    return this.sendTextMessage(phoneNumber, agentResponse, {
      delay,
      presence: 'composing'
    });
  }

  private calculateTypingDelay(text: string): number {
    const baseDelay = 1000;
    const charDelay = text.length * 30;
    const maxDelay = 10000;
    
    return Math.min(baseDelay + charDelay, maxDelay);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/instance/connect/${this.instance}`;
      
      const response = await axios.get(url, {
        headers: {
          'apikey': this.apiKey
        },
        timeout: 10000
      });

      logger.info('Evolution API health check', {
        status: response.status,
        instance: this.instance
      });

      return response.status === 200;
    } catch (error) {
      logger.error('Evolution API health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        instance: this.instance
      });
      return false;
    }
  }
}

export const evolutionApiService = new EvolutionApiService();
