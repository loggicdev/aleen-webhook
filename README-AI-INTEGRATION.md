# Aleen IA - Integração Python AI Agents

## 🎯 Visão Geral

Este projeto agora integra **agentes de IA conversacionais** usando a biblioteca oficial `openai-agents-python` da OpenAI, criando um sistema híbrido Node.js + Python para atendimento inteligente via WhatsApp.

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WhatsApp      │────│   Node.js       │────│   Python AI     │
│   (Evolution)   │    │   (Webhook +    │    │   (Agents)      │
│                 │    │    Redis)       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │     Redis       │
                       │   (Messages +   │
                       │   Context)      │
                       └─────────────────┘
```

### Fluxo de Processamento

1. **Webhook Recebido**: WhatsApp → Node.js
2. **Agregação Redis**: Mensagens agrupadas por 10 segundos
3. **Processamento IA**: Node.js → Python AI Agents
4. **Resposta Inteligente**: Agente escolhido responde
5. **Handoffs**: Transferência automática entre agentes

## 🤖 Agentes Disponíveis

### 1. **Onboarding Agent**
- **Objetivo**: Dar boas-vindas e coletar informações básicas
- **Especialidade**: Primeiro contato, qualificação inicial
- **Transfere para**: Sales Agent (interesse em serviços), Support Agent (dúvidas técnicas)

### 2. **Sales Agent** 
- **Objetivo**: Consultoria e vendas
- **Especialidade**: Necessidades específicas, apresentação de soluções
- **Transfere para**: Support Agent (questões técnicas)

### 3. **Support Agent**
- **Objetivo**: Suporte técnico especializado
- **Especialidade**: Implementação, configuração, troubleshooting
- **Transfere para**: Sales Agent (questões comerciais)

## 🚀 Como Executar

### Opção 1: Docker Compose (Recomendado)

```bash
# 1. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com sua OPENAI_API_KEY

# 2. Execute todos os serviços
docker-compose up --build

# 3. Teste a integração
./test-integration.sh
```

### Opção 2: Execução Manual

```bash
# Terminal 1: Redis
docker run -d -p 6379:6379 redis:7-alpine

# Terminal 2: Node.js
npm install
npm run dev

# Terminal 3: Python AI
cd python-ai
pip install -r requirements.txt
python main.py

# Terminal 4: Teste
./test-integration.sh
```

## 📡 Endpoints

### Node.js (porta 3000)
- `GET /health` - Health check
- `POST /webhook` - Webhook WhatsApp
- `GET /test` - Endpoint de teste

### Python AI (porta 8000)
- `GET /health` - Health check
- `GET /agents` - Lista agentes disponíveis
- `POST /chat` - Chat com agentes

## 💬 Exemplo de Uso

### Requisição para Python AI
```json
{
  "user_id": "5511999999999",
  "user_name": "João Silva", 
  "message": "Preciso de ajuda com automação",
  "conversation_history": []
}
```

### Resposta do Agente
```json
{
  "response": "Olá João! Sou especialista em onboarding da Aleen IA...",
  "agent_used": "onboarding",
  "should_handoff": false,
  "next_agent": null
}
```

## 🔧 Configuração

### Variáveis de Ambiente

```env
# OpenAI
OPENAI_API_KEY=sua_chave_aqui

# Redis
REDIS_URL=redis://redis:6379

# Comunicação entre serviços
PYTHON_AI_URL=http://python-ai:8000
```

### Estrutura de Arquivos

```
python-ai/
├── main.py              # FastAPI server com agentes
├── requirements.txt     # Dependências Python
├── .env                # Variáveis de ambiente
└── Dockerfile.python   # Container Python

src/services/
├── ai-agent.service.ts  # Cliente HTTP para Python
├── message-processor.service.ts  # Processamento integrado
└── redis-message.service.ts     # Redis + IA
```

## 📊 Logs e Monitoramento

### Logs do Node.js
- Agregação de mensagens Redis
- Comunicação com Python AI
- Processamento de webhooks

### Logs do Python AI
- Seleção de agentes
- Processamento com OpenAI
- Handoffs entre agentes

### Métricas Redis
- Mensagens agregadas
- Timeouts ativos
- Contexto de usuários

## 🔄 Handoffs entre Agentes

O sistema suporta transferências automáticas:

1. **Onboarding → Sales**: Usuário demonstra interesse em serviços
2. **Sales → Support**: Dúvidas técnicas durante vendas  
3. **Support → Sales**: Questões comerciais durante suporte

## 🧪 Testes

```bash
# Teste completo da integração
./test-integration.sh

# Teste webhook específico
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d @test-webhook.json

# Teste agente direto
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test",
    "user_name": "Test User",
    "message": "Olá, preciso de ajuda"
  }'
```

## 🐛 Troubleshooting

### Redis Connection Issues
```bash
# Verificar conexão Redis
docker exec -it <redis-container> redis-cli ping
```

### Python AI Not Responding
```bash
# Verificar logs Python
docker-compose logs python-ai

# Verificar saúde do serviço
curl http://localhost:8000/health
```

### OpenAI API Errors
- Verificar OPENAI_API_KEY no .env
- Verificar cotas da API OpenAI
- Verificar logs Python para erros específicos

## 🔮 Próximos Passos

1. **Envio de Respostas**: Integração com Evolution API para enviar respostas
2. **Memória Persistente**: Contexto de longo prazo no Redis
3. **Analytics**: Dashboard para métricas de agentes
4. **Customização**: Agentes específicos por cliente
5. **Multi-modal**: Processamento de áudio e imagem

## 📚 Recursos

- [OpenAI Agents Python](https://github.com/openai/openai-agents-python)
- [Evolution API](https://github.com/EvolutionAPI/evolution-api)
- [Redis](https://redis.io/docs/)
- [FastAPI](https://fastapi.tiangolo.com/)

---

**Desenvolvido com ❤️ pela equipe Aleen IA**
