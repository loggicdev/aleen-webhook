import axios from 'axios';
import logger from '../utils/logger';

interface SendTextMessageRequest {
  number: string;
  textMessage: {
    text: string;
  };
  options?: {
    delay?: number;
    presence?: 'composing' | 'recording' | 'paused';
    linkPreview?: boolean;
  };
}

interface SendTextMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
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

  /**
   * Envia mensagem de texto via Evolution API
   */
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
      // Limpa o número removendo caracteres especiais
      const cleanNumber = this.cleanPhoneNumber(phoneNumber);
      
      const payload: SendTextMessageRequest = {
        number: cleanNumber,
        textMessage: {
          text
        },
        options: {
          delay: options.delay || 1000,
          presence: options.presence || 'composing',
          linkPreview: options.linkPreview || false
        }
      };

      const url = `${this.baseUrl}/message/sendText/${this.instance}`;

      logger.info('Sending WhatsApp message via Evolution API', {
        url,
        number: cleanNumber,
        textLength: text.length,
        instance: this.instance
      });

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        },
        timeout: 30000 // 30 segundos
      });

      if (response.status === 200 || response.status === 201) {
        logger.info('WhatsApp message sent successfully', {
          number: cleanNumber,
          messageId: response.data?.key?.id || 'unknown',
          status: response.status
        });

        return {
          success: true,
          messageId: response.data?.key?.id
        };
      } else {
        logger.error('Evolution API returned non-success status', {
          status: response.status,
          data: response.data,
          number: cleanNumber
        });

        return {
          success: false,
          error: `API returned status ${response.status}`
        };
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

  /**
   * Envia mensagem de saudação inicial
   */
  async sendWelcomeMessage(phoneNumber: string, userName: string = ''): Promise<SendTextMessageResponse> {
    const welcomeText = `Olá${userName ? ` ${userName}` : ''}! 👋

Seja bem-vindo(a) à *Aleen IA*! 🤖✨

Sou sua assistente inteligente e estou aqui para te ajudar com automação de atendimento e soluções de IA para seu negócio.

Para começarmos, me conte um pouco sobre você:
• Qual o nome da sua empresa?
• Em que ramo vocês atuam?
• Qual o principal desafio que vocês enfrentam hoje?

Vamos conversar e descobrir como posso te ajudar! 😊`;

    return this.sendTextMessage(phoneNumber, welcomeText, {
      delay: 2000,
      presence: 'composing'
    });
  }

  /**
   * Envia mensagem personalizada baseada no agente
   */
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

  /**
   * Calcula delay baseado no tamanho da mensagem (simula digitação)
   */
  private calculateTypingDelay(text: string): number {
    // Aproximadamente 200 caracteres por minuto = 3.33 chars/segundo
    const charsPerSecond = 3.33;
    const baseDelay = 1000; // 1 segundo mínimo
    const calculatedDelay = (text.length / charsPerSecond) * 1000;
    
    // Máximo de 10 segundos
    return Math.min(Math.max(baseDelay, calculatedDelay), 10000);
  }

  /**
   * Limpa número de telefone para formato correto
   */
  private cleanPhoneNumber(phoneNumber: string): string {
    // Remove @s.whatsapp.net e caracteres especiais
    let cleaned = phoneNumber
      .replace('@s.whatsapp.net', '')
      .replace(/[^\d]/g, '');

    // Se não começar com 55 (Brasil), adiciona
    if (!cleaned.startsWith('55') && cleaned.length >= 10) {
      cleaned = '55' + cleaned;
    }

    return cleaned;
  }

  /**
   * Verifica se a API Evolution está disponível
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/instance/connectionState/${this.instance}`, {
        headers: {
          'apikey': this.apiKey
        },
        timeout: 5000
      });

      const isConnected = response.data?.instance?.state === 'open';
      
      logger.info('Evolution API health check', {
        available: response.status === 200,
        connected: isConnected,
        state: response.data?.instance?.state
      });

      return response.status === 200 && isConnected;

    } catch (error) {
      logger.error('Evolution API health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

export const evolutionApiService = new EvolutionApiService();
