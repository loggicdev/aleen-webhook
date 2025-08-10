import os
import re
import time
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from agents import Agent, Runner
from typing import List, Optional, Dict
import redis
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

app = FastAPI(title="Aleen AI Agents", version="1.0.0")

# Redis connection
try:
    redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
    # Test connection
    redis_client.ping()
    print("✅ Redis conectado com sucesso")
except Exception as e:
    print(f"⚠️ Erro ao conectar Redis: {e}")
    # Create a mock Redis client for development
    class MockRedis:
        def get(self, key): return None
        def setex(self, key, time, value): pass
        def ping(self): return True
    redis_client = MockRedis()

# OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Supabase client
supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Supabase URL and key are required")

supabase: Client = create_client(supabase_url, supabase_key)

# Evolution API Integration
class EvolutionAPIService:
    def __init__(self):
        self.base_url = os.getenv("EVOLUTION_API_BASE_URL", "")
        self.api_key = os.getenv("EVOLUTION_API_KEY", "")
        self.instance = os.getenv("EVOLUTION_INSTANCE", "")
        
        if not all([self.base_url, self.api_key, self.instance]):
            print("⚠️ Evolution API configuration incomplete")
    
    def clean_phone_number(self, phone: str) -> str:
        """Remove caracteres especiais do número de telefone"""
        return re.sub(r'[^\d]', '', phone)
    
    def split_message(self, text: str, max_length: int = 300) -> List[str]:
        """Quebra mensagem longa em múltiplas partes respeitando quebras naturais"""
        if len(text) <= max_length:
            return [text]
        
        messages = []
        current_message = ""
        
        # Quebra por parágrafos primeiro
        paragraphs = text.split('\n\n')
        
        for paragraph in paragraphs:
            # Se o parágrafo sozinho já excede o limite, quebra por frases
            if len(paragraph) > max_length:
                sentences = re.split(r'(?<=[.!?])\s+', paragraph)
                for sentence in sentences:
                    if len(current_message + sentence) > max_length:
                        if current_message:
                            messages.append(current_message.strip())
                            current_message = sentence
                        else:
                            # Frase muito longa, força quebra por palavras
                            words = sentence.split()
                            for word in words:
                                if len(current_message + " " + word) > max_length:
                                    if current_message:
                                        messages.append(current_message.strip())
                                        current_message = word
                                    else:
                                        current_message = word
                                else:
                                    current_message += " " + word if current_message else word
                    else:
                        current_message += sentence + " "
            else:
                # Parágrafo normal
                if len(current_message + paragraph) > max_length:
                    if current_message:
                        messages.append(current_message.strip())
                        current_message = paragraph
                    else:
                        current_message = paragraph
                else:
                    current_message += "\n\n" + paragraph if current_message else paragraph
        
        if current_message:
            messages.append(current_message.strip())
        
        return messages
    
    def send_text_message(self, phone_number: str, text: str, delay: int = 2000) -> bool:
        """Envia mensagem de texto via Evolution API com quebra automática"""
        try:
            clean_number = self.clean_phone_number(phone_number)
            messages = self.split_message(text)
            
            print(f"📱 Enviando {len(messages)} mensagem(s) para {clean_number}")
            print(f"🔍 Mensagens quebradas:")
            for i, msg in enumerate(messages):
                print(f"   {i+1}. ({len(msg)} chars): {msg[:50]}...")
            
            for i, message in enumerate(messages):
                payload = {
                    "number": clean_number,
                    "text": message,
                    "options": {
                        "delay": delay,
                        "presence": "composing", 
                        "linkPreview": False
                    }
                }
                
                url = f"{self.base_url}/message/sendText/{self.instance}"
                
                headers = {
                    "Content-Type": "application/json",
                    "apikey": self.api_key
                }
                
                response = requests.post(url, json=payload, headers=headers, timeout=30)
                
                if response.status_code in [200, 201]:
                    print(f"✅ Mensagem {i+1}/{len(messages)} enviada com sucesso")
                    if i < len(messages) - 1:  # Delay entre mensagens (só se não for a última)
                        print(f"⏱️ Aguardando {delay/1000}s antes da próxima mensagem...")
                        time.sleep(delay / 1000)  # Convert ms to seconds
                else:
                    print(f"❌ Erro ao enviar mensagem {i+1}: {response.status_code} - {response.text}")
                    return False
            
            return True
            
        except Exception as e:
            print(f"❌ Erro ao enviar mensagem via WhatsApp: {e}")
            return False

# Instanciar o serviço Evolution API
evolution_service = EvolutionAPIService()

class MessageRequest(BaseModel):
    user_id: str
    user_name: str
    message: str
    conversation_history: Optional[List[str]] = []
    recommended_agent: Optional[str] = None

class WhatsAppMessageRequest(BaseModel):
    user_id: str
    user_name: str
    phone_number: str
    message: str
    conversation_history: Optional[List[str]] = []
    recommended_agent: Optional[str] = None
    send_to_whatsapp: bool = True

class MessageResponse(BaseModel):
    response: str
    agent_used: str
    should_handoff: bool = False
    next_agent: Optional[str] = None

class WhatsAppMessageResponse(BaseModel):
    response: str
    agent_used: str
    should_handoff: bool = False
    next_agent: Optional[str] = None
    whatsapp_sent: bool = False
    messages_sent: int = 0

class SendWhatsAppRequest(BaseModel):
    phone_number: str
    message: str

# Cache para armazenar agentes do Supabase
agents_cache: Dict[str, Agent] = {}
agents_config: Dict[str, Dict] = {}

def load_agents_from_supabase():
    """Carrega os agentes e seus prompts do Supabase"""
    try:
        response = supabase.table('agents').select('*').execute()
        
        if not response.data:
            print("Nenhum agente encontrado no Supabase")
            return False
            
        global agents_cache, agents_config
        agents_cache.clear()
        agents_config.clear()
        
        # Mapeia os identifiers para tipos de agente (contexto FITNESS/NUTRIÇÃO)
        identifier_map = {
            'GREETING_WITHOUT_MEMORY': 'onboarding',  # Prompt fitness em inglês
            'DOUBT': 'support',                       # Prompt fitness em inglês  
            'SALES': 'sales',                         # Prompt fitness em inglês
            'OUT_CONTEXT': 'out_context',             # Agente para mensagens fora de contexto
            # Mantém compatibilidade com identifiers antigos
            'ONBOARDING_INIT': 'onboarding',
            'GREETING_WITH_MEMORY': 'onboarding',
            'ONBOARDING_PENDING': 'onboarding'
        }
        
        for agent_data in response.data:
            identifier = agent_data.get('identifier', '')
            agent_type = identifier_map.get(identifier, 'onboarding')
            
            # Sempre carrega o agente, pode sobrescrever se necessário
            agents_config[agent_type] = {
                'id': agent_data['id'],
                'name': agent_data.get('name', 'Aleen'),
                'prompt': agent_data.get('prompt', ''),
                'description': agent_data.get('description', ''),
                'identifier': identifier
            }
            
            # Cria o agente com o prompt do Supabase + instrução de idioma
            base_prompt = agent_data.get('prompt', '')
            
            # Adiciona instrução de idioma responsivo
            language_instruction = """

INSTRUÇÃO CRÍTICA DE IDIOMA:
- SEMPRE responda no mesmo idioma que o usuário está falando
- Se o usuário falar em português, responda em português  
- Se o usuário falar em inglês, responda em inglês
- Se o usuário falar em espanhol, responda em espanhol
- Mantenha o mesmo idioma durante toda a conversa
- Seja natural e fluente no idioma escolhido

"""
            
            final_prompt = base_prompt + language_instruction
            
            agents_cache[agent_type] = Agent(
                name=f"{agent_data.get('name', 'Aleen')} - {agent_type.title()}",
                instructions=final_prompt,
                model="gpt-4"
            )
        
        # Se não encontrou agente de sales, cria um baseado no padrão (não deveria acontecer mais)
        if 'sales' not in agents_config:
            agents_config['sales'] = {
                'id': 'generated-sales-fallback',
                'name': 'Aleen Sales Agent',
                'prompt': """You are Aleen Sales, the consultative sales specialist for Aleen IA business automation solutions.

Your objective is to understand business needs and present appropriate solutions.

**RULES:**
- Always respond in the same language the user is speaking to you
- Always break your messages with \\n\\n for more human and natural reading
- Be consultative, not pushy
- Focus on problems and solutions
- DO NOT invent information you're unsure about
- If you need technical support, transfer to Support Agent

**MAIN SERVICES:**
- Customer service automation with AI
- Intelligent WhatsApp chatbots
- Data analysis and insights
- Integration with existing systems

Ask about:
- Service volume
- Current processes
- Specific pain points
- Budget and timeline""",
                'description': 'Fallback sales agent with English prompt',
                'identifier': 'SALES_FALLBACK'
            }
            
            agents_cache['sales'] = Agent(
                name="Aleen Sales Agent",
                instructions=agents_config['sales']['prompt'],
                model="gpt-4"
            )
        
        print(f"Carregados {len(agents_cache)} agentes do Supabase:")
        for agent_type, config in agents_config.items():
            print(f"  - {agent_type}: {config['name']} ({config['identifier']})")
            
        return True
        
    except Exception as e:
        print(f"Erro ao carregar agentes do Supabase: {e}")
        return False

# Função para criar agentes padrão (fallback)
def create_default_agents():
    """Cria agentes padrão caso não consiga carregar do Supabase"""
    global agents_cache, agents_config
    
    print("🔧 Criando agentes padrão em português...")
    
    default_configs = {
        'onboarding': {
            'name': 'Aleen Onboarding PT',
            'prompt': """Você é a Aleen, a assistente inteligente de fitness e nutrição. Você é muito amigável, prestativa e clara.

Sua missão é dar as boas-vindas a novos contatos, apresentar brevemente o app e perguntar se eles têm interesse em conhecer.

**REGRAS:**
- SEMPRE responda no mesmo idioma que o usuário está falando
- SEMPRE quebre suas mensagens com \\n\\n para leitura mais humana e natural
- Seja calorosa e amigável
- Foque apenas em dar boas-vindas e apresentar o app de fitness
- NÃO invente informações ou "adivinhe" respostas

Sobre a Aleen: Sua personal trainer inteligente que funciona no WhatsApp, cria planos personalizados de treino e nutrição.
Pergunte se eles querem conhecer mais ou iniciar o teste grátis de 14 dias."""
        },
        'sales': {
            'name': 'Aleen Sales Agent',
            'prompt': """You are Aleen, the intelligent fitness and nutrition agent focused on helping users start their fitness journey.

**RULES:**
- Always respond in the same language the user is speaking to you
- Always break your messages with \\n\\n for more human and natural reading
- Be motivating and inspiring
- Focus on benefits and results
- DO NOT invent information you're unsure about

Help users understand benefits and guide them through starting their 14-day free trial.
Focus on personalized workout plans, nutrition guidance, and WhatsApp convenience."""
        },
        'support': {
            'name': 'Aleen Support Agent',
            'prompt': """You are Aleen, the intelligent fitness and nutrition agent helping with questions about the app.

**RULES:**
- Always respond in the same language the user is speaking to you
- Always break your messages with \\n\\n for more human and natural reading
- Be helpful and clear
- DO NOT invent information you're unsure about

Answer questions about how the app works, personalized workouts, nutrition plans, and the 14-day free trial.
Stay focused on fitness and nutrition topics only."""
        },
        'out_context': {
            'name': 'Aleen Out of Context Agent',
            'prompt': """You are Aleen, the intelligent fitness and nutrition agent.

Your role is to handle messages outside the context of fitness, nutrition, or the Aleen app.

**RULES:**
- Always respond in the same language the user is speaking to you
- Always break your messages with \\n\\n for more human and natural reading
- Be polite but redirect back to fitness topics
- DO NOT answer questions unrelated to fitness/nutrition
- DO NOT invent information outside your expertise

Politely redirect users back to fitness and nutrition topics where you can help them."""
        }
    }
    
    for agent_type, config in default_configs.items():
        agents_config[agent_type] = config
        agents_cache[agent_type] = Agent(
            name=config['name'],
            instructions=config['prompt'],
            model="gpt-4"
        )

# Carrega agentes na inicialização
if not load_agents_from_supabase():
    print("Usando agentes padrão como fallback")
    create_default_agents()

# Define AI Agents (removido - agora carregados do Supabase)
def onboarding_agent():
    return agents_cache.get('onboarding')

def sales_agent():
    return agents_cache.get('sales')

def support_agent():
    return agents_cache.get('support')

# Agent instances (agora referencia o cache)
agents = agents_cache

def determine_initial_agent(message: str, user_history: List[str], recommended_agent: Optional[str] = None) -> str:
    """Determina qual agente deve atender baseado na mensagem, histórico e recomendação"""
    
    # Se há uma recomendação específica, usa ela
    if recommended_agent and recommended_agent in agents:
        return recommended_agent
    
    # Palavras-chave claramente fora de contexto (não relacionadas a fitness)
    out_context_keywords = [
        "tempo", "weather", "clima", "política", "notícia", "futebol", "filme",
        "música", "receita", "cozinhar", "viagem", "trabalho", "estudo", "escola",
        "matemática", "história", "geografia", "programação", "tecnologia", "carros",
        "games", "jogos", "amor", "relacionamento", "piada", "joke", "previsão"
    ]
    
    message_lower = message.lower()
    
    # PRIMEIRA VERIFICAÇÃO: Se é claramente fora de contexto
    if any(keyword in message_lower for keyword in out_context_keywords):
        return "out_context"
    
    # Se é primeira interação E não é fora de contexto, vai para onboarding
    if not user_history:
        return "onboarding"
    
    # Palavras-chave para contexto FITNESS/NUTRIÇÃO
    fitness_keywords = [
        "treino", "exercício", "workout", "musculação", "cardio", "peso", "academia", 
        "fitness", "saúde", "emagrecer", "massa", "dieta", "nutrição", "calorias",
        "alimentação", "proteína", "carboidrato", "suplemento", "plano", "meta",
        "objetivo", "resultado", "progresso", "medidas", "corpo", "físico"
    ]
    
    # Palavras-chave para vendas (interesse em começar)
    sales_keywords = [
        "preço", "valor", "custo", "plano", "contratar", "comprar", "orçamento",
        "quero começar", "interessado", "teste", "gratis", "trial", "assinar"
    ]
    
    # Palavras-chave para suporte (dúvidas sobre funcionamento)
    support_keywords = [
        "como funciona", "como usar", "dúvida", "pergunta", "ajuda", "problema",
        "não entendi", "explicar", "dashboard", "acompanhar", "progresso"
    ]
    
    # Verifica se contém palavras de fitness (contexto correto)
    contains_fitness = any(keyword in message_lower for keyword in fitness_keywords)
    
    # Se não contém palavras de fitness, pode ser out_context
    if not contains_fitness:
        # Saudações simples vão para onboarding
        generic_greetings = ["oi", "olá", "hello", "hi", "bom dia", "boa tarde", "boa noite"]
        if message_lower.strip() in generic_greetings:
            return "onboarding"
        
        # Mensagens complexas sem contexto fitness vão para out_context
        if len(message_lower.split()) > 2:
            return "out_context"
    
    # Lógica normal para contexto fitness
    if any(keyword in message_lower for keyword in sales_keywords):
        return "sales"
    elif any(keyword in message_lower for keyword in support_keywords):
        return "support"
    else:
        # Default para onboarding se dentro do contexto fitness
        return "onboarding"

class ChatRequest(BaseModel):
    user_id: str
    user_name: str
    message: str
    conversation_history: Optional[List[str]] = []
    recommended_agent: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    agent_used: str
    should_handoff: bool = False
    next_agent: Optional[str] = None

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Processa uma mensagem de chat usando o agente apropriado"""
    
    try:
        # Verifica se há agentes carregados
        if not agents_cache:
            print("⚠️ Nenhum agente carregado, tentando recarregar...")
            if not load_agents_from_supabase():
                print("❌ Falha ao carregar agentes do Supabase")
                raise HTTPException(status_code=500, detail="No agents available")
        
        # Determina qual agente usar
        agent_type = request.recommended_agent or 'onboarding'
        
        # Adiciona instrução de idioma
        language_instruction = "\n\nIMPORTANTE: Sempre responda no mesmo idioma que o usuário está usando. Se o usuário escrever em português, responda em português. Se escrever em inglês, responda em inglês."
        
        # Log detalhado do processamento
        print(f"\n{'='*50}")
        print(f"📨 Recebida mensagem: {request.message}")
        print(f"👤 Usuário: {request.user_name} ({request.user_id})")
        print(f"🎯 Agente recomendado: {agent_type}")
        print(f"📚 Histórico: {len(request.conversation_history or [])} mensagens")
        
        # Mapeia o tipo para o identifier correto
        identifier_map = {
            'onboarding': 'GREETING_WITHOUT_MEMORY',
            'support': 'DOUBT',
            'sales': 'SALES',
            'out_context': 'OUT_CONTEXT'
        }
        
        identifier = identifier_map.get(agent_type, 'GREETING_WITHOUT_MEMORY')
        
        # Busca o agente no cache
        if identifier not in agents_cache:
            print(f"⚠️ Agente '{identifier}' não encontrado no cache")
            # Tenta usar onboarding como fallback
            identifier = 'GREETING_WITHOUT_MEMORY'
            if identifier not in agents_cache:
                print("❌ Nenhum agente disponível no cache")
                raise HTTPException(status_code=500, detail=f"Agent {agent_type} not found")
        
        agent = agents_cache[identifier]
        
        # Atualiza as instruções do agente com a instrução de idioma
        original_instructions = agent.instructions
        agent.instructions = original_instructions + language_instruction
        
        # Cria o contexto da conversa
        context = f"Usuário: {request.user_name}\n"
        if request.conversation_history:
            context += "Histórico:\n" + "\n".join(request.conversation_history[-5:]) + "\n"
        context += f"Mensagem atual: {request.message}"
        
        print(f"🚀 Executando agente: {identifier}")
        print(f"📝 Contexto de entrada:\n{context}")
        
        # Executa o agente usando Runner
        try:
            print("🔧 Iniciando Runner.run()...")
            response = Runner.run(
                agent=agent,
                messages=[{"role": "user", "content": context}]
            )
            
            print(f"✅ Runner.run() concluído")
            print(f"🔍 Tipo de resposta: {type(response)}")
            print(f"📤 Resposta completa: {response}")
            
            # Extrai a resposta baseado no tipo retornado
            if hasattr(response, 'messages') and response.messages:
                # Se response tem atributo messages
                final_response = response.messages[-1].content if hasattr(response.messages[-1], 'content') else str(response.messages[-1])
            elif hasattr(response, 'content'):
                # Se response tem atributo content
                final_response = response.content
            elif isinstance(response, dict):
                # Se response é um dicionário
                final_response = response.get('content', '') or response.get('response', '') or str(response)
            elif isinstance(response, str):
                # Se response já é uma string
                final_response = response
            else:
                # Fallback - converte para string
                final_response = str(response)
            
            print(f"📝 Resposta extraída: {final_response[:200]}...")
            
            # Valida se a resposta não é o próprio prompt
            prompt_indicators = [
                'you are aleen',
                'intelligent fitness', 
                'nutrition agent',
                '*about aleen*',
                '*behavior*',
                '*rules*',
                'your mission is to',
                'personalized greeting',
                'brief introduction'
            ]
            
            response_lower = final_response.lower()
            is_prompt_response = (
                len(final_response) > 400 and 
                sum(1 for indicator in prompt_indicators if indicator in response_lower) >= 3
            )
            
            if is_prompt_response:
                print("⚠️ ERRO CRÍTICO: Runner.run() retornou o prompt ao invés de processar!")
                print(f"❌ Resposta inválida detectada")
                
                # Gera resposta apropriada baseada no tipo de agente
                if identifier == 'GREETING_WITHOUT_MEMORY':
                    final_response = f"Oi {request.user_name}! 😊\n\nEu sou a Aleen, sua personal trainer inteligente aqui no WhatsApp!\n\nEstou aqui para criar treinos e planos de nutrição 100% personalizados para você.\n\nQuer conhecer como funciona? Temos 14 dias grátis! 💪"
                elif identifier == 'DOUBT':
                    final_response = f"Oi {request.user_name}! Como posso ajudar você hoje? 😊"
                elif identifier == 'SALES':
                    final_response = f"Olá {request.user_name}! Que bom falar com você! Como posso ajudar?"
                else:
                    final_response = f"Oi {request.user_name}! 👋"
            
            # Restaura as instruções originais
            agent.instructions = original_instructions
            
            return ChatResponse(
                response=final_response,
                agent_used=identifier,
                should_handoff=False
            )
            
        except Exception as runner_error:
            print(f"❌ Erro ao executar Runner.run(): {str(runner_error)}")
            print(f"🔍 Tipo do erro: {type(runner_error)}")
            import traceback
            print(f"📋 Stack trace:\n{traceback.format_exc()}")
            
            # Restaura as instruções originais
            agent.instructions = original_instructions
            
            # Retorna uma resposta padrão
            return ChatResponse(
                response=f"Oi {request.user_name}! Desculpe, tive um problema técnico. Mas estou aqui para ajudar você com seus objetivos fitness! Em que posso ajudar?",
                agent_used=identifier,
                should_handoff=False
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro no endpoint /chat: {str(e)}")
        import traceback
        print(f"📋 Stack trace:\n{traceback.format_exc()}")
        
        return ChatResponse(
            response="Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.",
            agent_used="error",
            should_handoff=True
        )

@app.post("/whatsapp-chat", response_model=WhatsAppMessageResponse)
async def whatsapp_chat(request: WhatsAppMessageRequest):
    """
    Processa mensagem e envia resposta automaticamente via WhatsApp
    """
    try:
        if not agents:
            raise HTTPException(status_code=503, detail="Agentes não carregados")
        
        # Determina agente inicial
        initial_agent = determine_initial_agent(
            message=request.message,
            user_history=request.conversation_history or [],
            recommended_agent=request.recommended_agent
        )
        
        if initial_agent not in agents:
            initial_agent = "support"  # fallback
        
        # Recupera contexto do Redis
        context_key = f"user_context:{request.user_id}"
        existing_context = redis_client.get(context_key)
        context_str = existing_context.decode('utf-8') if existing_context else ""
        
        # Prepara histórico
        if request.conversation_history:
            conversation_context = "\n".join(request.conversation_history)
        else:
            conversation_context = context_str
        
        # Cria contexto completo
        full_context = f"{conversation_context}\nUser: {request.message}" if conversation_context else f"User: {request.message}"
        
        print(f"🤖 Processando mensagem WhatsApp para usuário {request.user_name} ({request.phone_number}) com agente {initial_agent}")
        
        # Executa agente
        response = await Runner.run(
            starting_agent=agents[initial_agent],
            input=full_context  # Enviar como string simples
        )
        
        # Salva contexto atualizado no Redis
        updated_context = f"{context_str}\nUser: {request.message}\nAgent: {response.final_output}"
        redis_client.setex(f"user_context:{request.user_id}", 3600, updated_context)  # 1 hora
        
        # Envia resposta via WhatsApp se solicitado
        whatsapp_sent = False
        messages_sent = 0
        
        if request.send_to_whatsapp:
            try:
                messages = evolution_service.split_message(response.final_output)
                messages_sent = len(messages)
                whatsapp_sent = evolution_service.send_text_message(
                    phone_number=request.phone_number,
                    text=response.final_output,
                    delay=1500  # 1.5s delay entre mensagens
                )
                
                if whatsapp_sent:
                    print(f"✅ Resposta enviada via WhatsApp para {request.phone_number} ({messages_sent} mensagens)")
                else:
                    print(f"❌ Falha ao enviar resposta via WhatsApp para {request.phone_number}")
                    
            except Exception as whatsapp_error:
                print(f"❌ Erro ao processar envio WhatsApp: {whatsapp_error}")
                whatsapp_sent = False
        
        return WhatsAppMessageResponse(
            response=response.final_output,
            agent_used=initial_agent,
            should_handoff=False,
            next_agent=None,
            whatsapp_sent=whatsapp_sent,
            messages_sent=messages_sent
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento WhatsApp: {str(e)}")

@app.post("/send-whatsapp")
async def send_whatsapp_message(request: SendWhatsAppRequest):
    """
    Endpoint para enviar mensagem diretamente via WhatsApp
    """
    try:
        messages = evolution_service.split_message(request.message)
        success = evolution_service.send_text_message(request.phone_number, request.message)
        
        return {
            "success": success,
            "phone_number": request.phone_number,
            "messages_sent": len(messages),
            "message_length": len(request.message)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao enviar WhatsApp: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "aleen-ai-agents"}

@app.get("/agents")
async def list_agents():
    return {
        "agents": list(agents.keys()),
        "details": {
            agent_type: {
                "name": config.get("name", "Unknown"),
                "identifier": config.get("identifier", "Unknown"),
                "description": config.get("description", "No description")
            }
            for agent_type, config in agents_config.items()
        }
    }

@app.post("/reload-agents")
async def reload_agents():
    """Recarrega os agentes do Supabase"""
    try:
        success = load_agents_from_supabase()
        if success:
            # Atualiza a referência global
            global agents
            agents = agents_cache
            
            return {
                "success": True,
                "message": f"Agentes recarregados com sucesso",
                "agents_loaded": list(agents.keys()),
                "total": len(agents)
            }
        else:
            return {
                "success": False,
                "message": "Falha ao carregar agentes do Supabase"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao recarregar agentes: {str(e)}")

@app.get("/agents/config")
async def get_agents_config():
    """Retorna a configuração completa dos agentes"""
    return {
        "agents_config": agents_config,
        "total_agents": len(agents_config)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
