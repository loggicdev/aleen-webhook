import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';

interface ChatRequest {
  user_id: string;
  user_name: string;
  message: string;
  conversation_history?: string[];
  recommended_agent?: string;
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

  async processMessage(
    userId: string,
    userName: string,
    message: string,
    conversationHistory: string[] = [],
    recommendedAgent?: string
  ): Promise<ChatResponse> {
    try {
      logger.info('Starting AI agent communication', {
        userId,
        userName,
        messageLength: message.length,
        historyLength: conversationHistory.length,
        recommendedAgent,
        pythonServiceUrl: this.pythonServiceUrl
      });

      const request: ChatRequest = {
        user_id: userId,
        user_name: userName,
        message,
        conversation_history: conversationHistory,
        recommended_agent: recommendedAgent
      };

      logger.info('Sending request to Python AI service', {
        url: `${this.pythonServiceUrl}/chat`,
        request: {
          user_id: request.user_id,
          user_name: request.user_name,
          messageLength: request.message.length,
          historyLength: request.conversation_history?.length || 0,
          recommended_agent: request.recommended_agent
        }
      });

      const response = await axios.post<ChatResponse>(
        `${this.pythonServiceUrl}/chat`,
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
        logger.error('Python AI returned undefined or invalid response', {
          responseData: response.data,
          fullResponse: JSON.stringify(response.data)
        });
        
        return {
          response: 'Olá! Sou a Aleen IA. No momento estou com dificuldades técnicas, mas em breve poderei te ajudar melhor. Como posso te ajudar hoje?',
          agent_used: 'fallback',
          should_handoff: false
        };
      }

      return response.data;
    } catch (error) {
      logger.error('Error communicating with Python AI service', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        userName,
        messageLength: message.length,
        isAxiosError: error && typeof error === 'object' && 'isAxiosError' in error,
        ...(error && typeof error === 'object' && 'response' in error && error.response ? {
          responseStatus: (error.response as any).status,
          responseData: (error.response as any).data
        } : {})
      });
      
      // Fallback para resposta padrão em caso de erro
      return {
        response: 'Olá! Sou a Aleen IA. No momento estou com dificuldades técnicas, mas em breve poderei te ajudar melhor. Como posso te ajudar hoje?',
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
