# 🤖 Aleen IA

Sistema de IA conversacional multi-agente para WhatsApp, desenvolvido para atendimento automatizado inteligente com especialistas virtuais.

## 📋 Descrição

O Aleen IA é um sistema completo de chatbot inteligente que integra com a Evolution API para processar mensagens do WhatsApp e responder através de múltiplos agentes especializados:

- **🏢 Aleen Recepcionista** - Triagem inicial e saudações
- **💰 Aleen Financeiro** - Vendas e questões comerciais  
- **🏋️ Aleen Personal** - Treinos e exercícios físicos
- **🥗 Aleen Nutricionista** - Orientações alimentares e dietas

## 🚀 Funcionalidades

- ✅ **Multi-modal**: Suporte a texto, áudio, imagem e vídeo
- ✅ **Transcrição de áudio** via OpenAI Whisper
- ✅ **Memória de conversas** com Redis
- ✅ **Classificação inteligente** de intenções do usuário
- ✅ **Roteamento automático** para agentes especializados
- ✅ **Diferenciação cliente/lead** automática
- ✅ **Sistema de logs** estruturado
- ✅ **Validação robusta** de webhooks

## 🛠️ Stack Tecnológico

- **Backend**: Node.js + TypeScript + Express
- **IA**: OpenAI GPT-4 + Whisper
- **Cache**: Redis
- **Validação**: Joi
- **Logs**: Winston
- **Containerização**: Docker + Docker Compose

## 📦 Instalação

### Pré-requisitos

- Node.js 18+
- Redis
- Conta OpenAI (API Key)
- Evolution API configurada

### Desenvolvimento Local

```bash
# Clone o repositório
git clone https://github.com/loggicdev/aleen-ia.git
cd aleen-ia

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Inicie o Redis (via Docker)
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Execute em modo desenvolvimento
npm run dev
```

### Com Docker Compose

```bash
# Clone o repositório
git clone https://github.com/loggicdev/aleen-ia.git
cd aleen-ia

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Execute com Docker Compose
docker-compose up -d
```

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

```bash
# Environment
NODE_ENV=development
PORT=3000

# API Keys
OPENAI_API_KEY=sk-...
EVOLUTION_API_KEY=343B61170356-4C36-A7F5-C60AE886CC92

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Evolution API
EVOLUTION_API_BASE_URL=https://evo-iafit.live.claudy.host
EVOLUTION_INSTANCE=aleen

# Webhooks Externos
ONBOARDING_WEBHOOK_URL=https://webhook.conectaredeseti.com.br/webhook/aleen_onboarding
GREETING_WEBHOOK_URL=https://webhook.conectaredeseti.com.br/webhook/aleen_saudacao
DOUBT_WEBHOOK_URL=https://webhook.conectaredeseti.com.br/webhook/aleen_duvidas
OUT_CONTEXT_WEBHOOK_URL=https://webhook.conectaredeseti.com.br/webhook/aleen_fora_contexto
VERIFY_USER_WEBHOOK_URL=https://webhook.conectaredeseti.com.br/webhook/verify_user

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Configuração da Evolution API

Configure sua instância da Evolution API para enviar webhooks para:

```
POST https://seu-dominio.com/api/webhook/evolution
```

## 🚀 Uso

### Endpoints Disponíveis

#### Webhook Principal
```bash
POST /api/webhook/evolution
Content-Type: application/json

# Recebe webhooks da Evolution API
```

#### Health Check
```bash
GET /api/webhook/health

# Resposta:
{
  "success": true,
  "message": "Aleen IA is running",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

#### Teste
```bash
GET /api/webhook/test

# Endpoint para verificar funcionamento
```

### Exemplo de Payload Webhook

```json
{
  "body": {
    "event": "messages.upsert",
    "instance": "iafit",
    "data": {
      "key": {
        "remoteJid": "5511994072477@s.whatsapp.net",
        "fromMe": false,
        "id": "3A84CA18E8131EDB1E73"
      },
      "pushName": "Icaro Rocha",
      "message": {
        "conversation": "Olá, gostaria de saber sobre os planos"
      },
      "messageType": "conversation",
      "messageTimestamp": 1751171208,
      "instanceId": "f43e8770-7a60-45eb-86c7-dfe3c3309882",
      "source": "ios"
    },
    "apikey": "343B61170356-4C36-A7F5-C60AE886CC92"
  }
}
```

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Executar em modo watch
npm run test:watch

# Gerar relatório de coverage
npm run test:coverage

# Linting
npm run lint
npm run lint:fix
```

## 📊 Monitoramento

### Logs

Os logs são salvos em:
- `logs/combined.log` - Todos os logs
- `logs/error.log` - Apenas erros
- Console - Output formatado para desenvolvimento

### Health Check

Monitore a saúde da aplicação:
```bash
curl http://localhost:3000/api/webhook/health
```

## 🔧 Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento com hot reload
npm run build        # Build para produção
npm start           # Executa versão compilada
npm test            # Executa testes
npm run lint        # Linting do código
npm run lint:fix    # Fix automático de linting
```

## 📈 Roadmap

### ✅ Fase 1 - Base (Atual)
- [x] Webhook receiver
- [x] Validação de payloads
- [x] Sistema de logging
- [x] Estrutura de tipos TypeScript

### 🔄 Fase 2 - Processamento (Em Desenvolvimento)
- [ ] Sistema Redis para memória
- [ ] Transcrição de áudio
- [ ] Classificação de tipos de mensagem
- [ ] Parser de dados de entrada

### 📋 Fase 3 - Agentes IA (Planejado)
- [ ] Sistema base de agentes
- [ ] Classificação de intenções
- [ ] Aleen Recepcionista
- [ ] Aleen Financeiro
- [ ] Aleen Personal
- [ ] Aleen Nutricionista

### 🚀 Fase 4 - Integração (Planejado)
- [ ] Verificação de clientes
- [ ] Webhooks externos
- [ ] Sistema de respostas
- [ ] Rate limiting

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👥 Equipe

- **Logicdev** - Desenvolvimento e arquitetura

## 📞 Suporte

Para suporte e dúvidas:
- Abra uma [issue](https://github.com/loggicdev/aleen-ia/issues)
- Email: suporte@logicdev.com.br
