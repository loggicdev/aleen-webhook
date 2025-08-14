import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';

interface UserContext {
  user_id?: string;
  has_account: boolean;
  onboarding_completed: boolean;
  user_type: string; // 'new_user' | 'incomplete_onboarding' | 'complete_user'
  onboarding_url?: string | null;
  is_lead: boolean;
  is_user: boolean;
}

interface ChatRequest {
  user_id: string;
  user_name: string;
  phone_number: string;
  message: string;
  conversation_history?: string[];
  recommended_agent?: string | null;
  send_to_whatsapp: boolean;
  user_context?: UserContext;
}

interface ChatResponse {
  response: string;
  agent_used: string;
  should_handoff: boolean;
  next_agent?: string;
}

class AiAgentService {
  private pythonServiceUrl: string;

  constructor() {
    this.pythonServiceUrl = config.pythonAi.baseUrl;
  }

  private isConnectionError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || '';
    const errorCode = error.code || '';
    
    // Verificar se é erro de conexão específico
    const connectionErrors = [
      'ENOTFOUND',
      'ECONNREFUSED', 
      'ECONNRESET',
      'ETIMEDOUT',
      'getaddrinfo ENOTFOUND',
      'connect ECONNREFUSED'
    ];
    
    // Verificar por código de erro ou mensagem
    const hasConnectionError = connectionErrors.some(errType => 
      errorCode.includes(errType) || errorMessage.includes(errType)
    );
    
    // Verificar se é AggregateError com erros de conexão
    if (error.name === 'AggregateError' && Array.isArray(error.errors)) {
      return error.errors.some((err: any) => this.isConnectionError(err));
    }
    
    // Verificar se é erro de axios com problemas de rede
    if (error.isAxiosError && !error.response) {
      return true;
    }
    
    logger.debug('Connection error check', {
      errorMessage,
      errorCode,
      errorName: error.name,
      hasConnectionError,
      isAxiosError: error.isAxiosError,
      hasResponse: !!error.response
    });
    
    return hasConnectionError;
  }

  async processMessage(
    phoneNumber: string,
    userName: string,
    message: string,
    conversationHistory: string[] = [],
    recommendedAgent?: string,
    userContext?: UserContext
  ): Promise<ChatResponse> {
    try {
      logger.info('🚀 Starting AI agent communication', {
        phoneNumber,
        userName,
        messageLength: message.length,
        historyLength: conversationHistory.length,
        recommendedAgent,
        userContext,
        pythonServiceUrl: this.pythonServiceUrl,
        fullUrl: `${this.pythonServiceUrl}/whatsapp-chat`,
        timestamp: new Date().toISOString()
      });

      const request: ChatRequest = {
        user_id: userContext?.user_id || `temp-id-${Date.now()}`,
        user_name: userName,
        phone_number: phoneNumber, // phoneNumber é o número limpo
        message,
        conversation_history: conversationHistory,
        recommended_agent: recommendedAgent || null,
        send_to_whatsapp: true,
        user_context: userContext || {
          has_account: false,
          onboarding_completed: false,
          user_type: 'new_user',
          onboarding_url: null,
          is_lead: false,
          is_user: false
        }
      };

      logger.info('📤 Sending request to Python AI service', {
        url: `${this.pythonServiceUrl}/whatsapp-chat`,
        request: {
          user_id: request.user_id,
          user_name: request.user_name,
          messageLength: request.message.length,
          historyLength: request.conversation_history?.length || 0,
          recommended_agent: request.recommended_agent,
          send_to_whatsapp: request.send_to_whatsapp
        },
        timestamp: new Date().toISOString()
      });

      const response = await axios.post<ChatResponse>(
        `${this.pythonServiceUrl}/whatsapp-chat`,
        request,
        {
          timeout: 30000, // 30 segundos
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Received response from Python AI service', {
        status: response.status,
        statusText: response.statusText,
        responseData: {
          response: response.data.response ? `"${response.data.response.substring(0, 200)}..."` : 'UNDEFINED_RESPONSE',
          responseType: typeof response.data.response,
          responseLength: response.data.response ? response.data.response.length : 0,
          agent_used: response.data.agent_used,
          should_handoff: response.data.should_handoff,
          next_agent: response.data.next_agent,
          fullData: JSON.stringify(response.data)
        }
      });

      // Validação da resposta
      if (!response.data.response || response.data.response === 'undefined') {
        logger.error('⚠️ Python AI returned undefined or invalid response - using fallback', {
          phoneNumber,
          userName,
          pythonServiceUrl: this.pythonServiceUrl,
          responseData: response.data,
          fullResponse: JSON.stringify(response.data),
          fallbackReason: 'Invalid Python response',
          fallbackAgent: 'fallback'
        });
        
        return {
          response: 'Olá! Sou a Aleen IA. No momento estou com dificuldades técnicas, mas em breve poderei te ajudar melhor. Como posso te ajudar hoje?',
          agent_used: 'fallback',
          should_handoff: false
        };
      }

      // Log de sucesso na comunicação com Python
      logger.info('✅ Python AI service responded successfully', {
        phoneNumber,
        userName,
        pythonServiceUrl: this.pythonServiceUrl,
        agent_used: response.data.agent_used,
        responseLength: response.data.response ? response.data.response.length : 0,
        should_handoff: response.data.should_handoff,
        processingTime: 'Success within timeout'
      });

      return response.data;
    } catch (error) {
      logger.error('❌ Error communicating with Python AI service', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        phoneNumber,
        userName,
        messageLength: message.length,
        pythonServiceUrl: this.pythonServiceUrl,
        fullUrl: `${this.pythonServiceUrl}/whatsapp-chat`,
        errorType: error?.constructor?.name,
        isAxiosError: error && typeof error === 'object' && 'isAxiosError' in error,
        ...(error && typeof error === 'object' && 'response' in error && error.response ? {
          responseStatus: (error.response as any).status,
          responseData: (error.response as any).data,
          responseHeaders: (error.response as any).headers
        } : {}),
        ...(error && typeof error === 'object' && 'request' in error && error.request ? {
          hasRequest: true,
          requestMethod: (error.request as any).method,
          requestUrl: (error.request as any).url
        } : {}),
        ...(error && typeof error === 'object' && 'code' in error ? {
          errorCode: (error as any).code
        } : {})
      });
      
      // Detectar se é erro de conexão para usar mensagem específica
      const isConnectionError = this.isConnectionError(error);
      
      logger.error('🔍 Connection error analysis', {
        isConnectionError,
        errorMessage: error instanceof Error ? error.message : 'No message',
        errorCode: (error as any)?.code || 'No code',
        errorName: (error as any)?.name || 'No name'
      });
      
      const fallbackMessage = isConnectionError 
        ? 'Olá! 👋 Nosso sistema de IA está temporariamente em manutenção. Nossa equipe está trabalhando para resolver rapidamente. Que tal tentar novamente em alguns minutos? Se for urgente, você pode entrar em contato conosco diretamente!'
        : 'Olá! Sou a Aleen IA. No momento estou com dificuldades técnicas, mas em breve poderei te ajudar melhor. Como posso te ajudar hoje?';
      
      logger.warn('⚠️ Using fallback message due to Python service failure', {
        phoneNumber,
        userName,
        pythonServiceUrl: this.pythonServiceUrl,
        isConnectionError,
        messageType: isConnectionError ? 'maintenance' : 'technical_difficulties',
        fallbackAgent: 'fallback',
        reason: isConnectionError ? 'Python service unreachable' : 'Python service error'
      });
      
      return {
        response: fallbackMessage,
        agent_used: 'fallback',
        should_handoff: false
      };
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      logger.info('Checking Python AI service health', {
        url: `${this.pythonServiceUrl}/health`
      });

      const response = await axios.get(`${this.pythonServiceUrl}/health`, {
        timeout: 5000
      });

      logger.info('Python AI service health check result', {
        status: response.status,
        data: response.data
      });

      return response.status === 200;
    } catch (error) {
      logger.error('Python AI service health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: `${this.pythonServiceUrl}/health`
      });
      return false;
    }
  }

  async getAvailableAgents(): Promise<string[]> {
    try {
      logger.info('Fetching available agents from Python AI service', {
        url: `${this.pythonServiceUrl}/agents`
      });

      const response = await axios.get(`${this.pythonServiceUrl}/agents`, {
        timeout: 5000
      });

      logger.info('Available agents fetched successfully', {
        agents: response.data.agents || [],
        details: response.data.details || {}
      });

      return response.data.agents || [];
    } catch (error) {
      logger.error('Error fetching available agents', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: `${this.pythonServiceUrl}/agents`
      });
      return ['onboarding', 'sales', 'support']; // fallback
    }
  }
}

export const aiAgentService = new AiAgentService();
