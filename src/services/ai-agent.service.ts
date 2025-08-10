import axios from 'axios';

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
    this.pythonServiceUrl = process.env.PYTHON_AI_URL || 'http://python-ai:8000';
  }

  async processMessage(
    userId: string,
    userName: string,
    message: string,
    conversationHistory: string[] = [],
    recommendedAgent?: string
  ): Promise<ChatResponse> {
    try {
      const request: ChatRequest = {
        user_id: userId,
        user_name: userName,
        message,
        conversation_history: conversationHistory,
        recommended_agent: recommendedAgent
      };

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

      return response.data;
    } catch (error) {
      console.error('Erro ao comunicar com o serviço Python:', error);
      
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
      const response = await axios.get(`${this.pythonServiceUrl}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.error('Serviço Python indisponível:', error);
      return false;
    }
  }

  async getAvailableAgents(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.pythonServiceUrl}/agents`, {
        timeout: 5000
      });
      return response.data.agents || [];
    } catch (error) {
      console.error('Erro ao buscar agentes disponíveis:', error);
      return ['onboarding', 'sales', 'support']; // fallback
    }
  }
}

export const aiAgentService = new AiAgentService();
