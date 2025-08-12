import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger';

interface Lead {
  id: string;
  phone: string;
  name?: string;
  onboarding_concluido?: boolean;
  onboarding?: boolean;
  user_id?: string;
  created_at: string;
  updated_at?: string;
}

interface User {
  id: string;
  phone: string;
  name?: string;
  nickname?: string;
  created_at: string;
}

interface Agent {
  id: string;
  identifier: string;
  name: string;
  prompt: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserStatus {
  isLead: boolean;
  isUser: boolean;
  isFirstMessage: boolean;
  onboardingCompleted: boolean;
  userData: Lead | User | null;
  needsOnboarding: boolean;
  recommendedAgent: string;
}

class SupabaseUserService {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Service Role Key are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    logger.info('Supabase client initialized');
  }

  /**
   * Verifica a situação do usuário no Supabase
   */
  async checkUserStatus(telefone: string): Promise<UserStatus> {
    try {
      // Remove caracteres especiais do telefone para busca
      const cleanPhone = this.cleanPhoneNumber(telefone);
      
      logger.info('Checking user status in Supabase', { telefone: cleanPhone });

      // 1. Primeiro verifica se é um usuário
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('*')
        .eq('phone', cleanPhone)
        .single();

      if (userData && !userError) {
        logger.info('User found in users table', { 
          userId: userData.id,
          name: userData.name
        });

        return {
          isLead: false,
          isUser: true,
          isFirstMessage: false,
          onboardingCompleted: true,
          userData,
          needsOnboarding: false,
          recommendedAgent: 'DOUBT' // Usuários existentes vão para suporte
        };
      }

      // 2. Se não é usuário, verifica se é lead
      const { data: leadData, error: leadError } = await this.supabase
        .from('leads')
        .select('*')
        .eq('phone', cleanPhone)
        .single();

      if (leadData && !leadError) {
        logger.info('Lead found in leads table', { 
          leadId: leadData.id,
          name: leadData.name,
          onboarding_concluido: leadData.onboarding_concluido
        });

        return {
          isLead: true,
          isUser: false,
          isFirstMessage: false,
          onboardingCompleted: leadData.onboarding_concluido || false,
          userData: leadData,
          needsOnboarding: !leadData.onboarding_concluido,
          recommendedAgent: leadData.onboarding_concluido ? 'SALES' : 'GREETING_WITHOUT_MEMORY'
        };
      }

      // 3. Se não encontrou nem user nem lead, é primeira mensagem
      logger.info('No user or lead found - first message', { telefone: cleanPhone });

      // Cria um novo lead
      const newLead = await this.createNewLead(cleanPhone);

      return {
        isLead: true,
        isUser: false,
        isFirstMessage: true,
        onboardingCompleted: false,
        userData: newLead,
        needsOnboarding: true,
        recommendedAgent: 'GREETING_WITHOUT_MEMORY'
      };

    } catch (error) {
      logger.error('Error checking user status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        telefone
      });

      // Em caso de erro, assume primeira mensagem
      return {
        isLead: true,
        isUser: false,
        isFirstMessage: true,
        onboardingCompleted: false,
        userData: null,
        needsOnboarding: true,
        recommendedAgent: 'GREETING_WITHOUT_MEMORY'
      };
    }
  }

  /**
   * Cria um novo lead no banco
   */
  private async createNewLead(telefone: string): Promise<Lead> {
    try {
      const { data, error } = await this.supabase
        .from('leads')
        .insert({
          phone: telefone,
          onboarding_concluido: false
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating new lead', { error: error.message, telefone });
        throw error;
      }

      logger.info('New lead created', { leadId: data.id, telefone });
      return data;

    } catch (error) {
      logger.error('Failed to create new lead', {
        error: error instanceof Error ? error.message : 'Unknown error',
        telefone
      });
      throw error;
    }
  }

  /**
   * Busca agentes ativos no Supabase
   */
  async getAgents(): Promise<Agent[]> {
    try {
      const { data, error } = await this.supabase
        .from('agents')
        .select('*')
        .eq('ativo', true);

      if (error) {
        logger.error('Error fetching agents', { error: error.message });
        return [];
      }

      logger.info('Agents fetched from Supabase', { count: data?.length || 0 });
      return data || [];

    } catch (error) {
      logger.error('Failed to fetch agents', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Busca um agente específico por tipo
   */
  async getAgentByType(tipo: string): Promise<Agent | null> {
    try {
      const { data, error } = await this.supabase
        .from('agents')
        .select('*')
        .eq('identifier', tipo)
        .single();

      if (error) {
        logger.error('Error fetching agent by type', { error: error.message, tipo });
        return null;
      }

      logger.info('Agent found by type', { agentId: data.id, tipo, name: data.name });
      return data;

    } catch (error) {
      logger.error('Failed to fetch agent by type', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tipo
      });
      return null;
    }
  }

  /**
   * Limpa o número de telefone removendo caracteres especiais
   */
  private cleanPhoneNumber(telefone: string): string {
    // Remove @s.whatsapp.net e outros caracteres especiais
    return telefone
      .replace('@s.whatsapp.net', '')
      .replace(/[^\d]/g, '');
  }

  /**
   * Atualiza o status de onboarding de um lead
   */
  async completeOnboarding(telefone: string): Promise<boolean> {
    try {
      const cleanPhone = this.cleanPhoneNumber(telefone);
      
      const { error } = await this.supabase
        .from('leads')
        .update({ 
          onboarding_concluido: true,
          updated_at: new Date().toISOString()
        })
        .eq('phone', cleanPhone);

      if (error) {
        logger.error('Error completing onboarding', { error: error.message, telefone });
        return false;
      }

      logger.info('Onboarding completed for lead', { telefone: cleanPhone });
      return true;

    } catch (error) {
      logger.error('Failed to complete onboarding', {
        error: error instanceof Error ? error.message : 'Unknown error',
        telefone
      });
      return false;
    }
  }
}

export const supabaseUserService = new SupabaseUserService();
