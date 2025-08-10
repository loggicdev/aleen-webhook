# Fluxo de Verificação de Usuário - Supabase + Evolution API

## 🎯 Visão Geral

Este documento detalha o fluxo completo de verificação de usuário integrado com **Supabase** e **Evolution API**, implementando as regras de negócio para leads e usuários existentes.

## 📊 Estrutura do Banco (Supabase)

### Tabela `leads`
```sql
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telefone VARCHAR(20) NOT NULL UNIQUE,
  nome VARCHAR(255),
  status VARCHAR(50) DEFAULT 'novo',
  onboarding_concluido BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela `users`
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telefone VARCHAR(20) NOT NULL UNIQUE,
  nome VARCHAR(255),
  email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela `agents`
```sql
CREATE TABLE agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'onboarding', 'sales', 'support'
  prompt_saudacao TEXT,
  prompt_onboarding TEXT,
  prompt_sistema TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔄 Fluxo de Processamento

```
┌─────────────────┐
│   Webhook       │
│   Recebido      │
└─────┬───────────┘
      │
      ▼
┌─────────────────┐
│   Agregação     │
│   Redis (10s)   │
└─────┬───────────┘
      │
      ▼
┌─────────────────┐
│   Verificação   │
│   Supabase      │
└─────┬───────────┘
      │
      ▼
┌─────────────────┐
│   Decisão       │
│   de Fluxo      │
└─────┬───────────┘
      │
      ▼
┌─────────────────┬─────────────────┬─────────────────┐
│   1ª Mensagem   │   Lead sem      │   Usuário/Lead  │
│   ou Lead Novo  │   Onboarding    │   Completo      │
└─────┬───────────┴─────┬───────────┴─────┬───────────┘
      │                 │                 │
      ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Saudação      │ │   Saudação      │ │   Processamento │
│   Inicial       │ │   Onboarding    │ │   com IA        │
│   (Evolution)   │ │   (Evolution)   │ │   + Evolution   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## 🚦 Regras de Negócio

### 1. **Primeira Mensagem ou Lead Novo**
- **Condição**: Telefone não existe em `leads` nem `users`
- **Ação**: 
  - Cria novo lead no Supabase
  - Envia saudação inicial via Evolution API
  - **NÃO** processa com IA
  - Status: `onboarding_concluido = false`

### 2. **Lead Existente sem Onboarding**
- **Condição**: Existe em `leads` com `onboarding_concluido = false`
- **Ação**:
  - Envia prompt de onboarding via Evolution API
  - **NÃO** processa com IA
  - Mantém status atual

### 3. **Lead com Onboarding Completo**
- **Condição**: Existe em `leads` com `onboarding_concluido = true`
- **Ação**:
  - Processa com **Sales Agent**
  - Envia resposta via Evolution API

### 4. **Usuário Existente**
- **Condição**: Existe na tabela `users`
- **Ação**:
  - Processa com **Support Agent**
  - Envia resposta via Evolution API

## 🤖 Seleção de Agentes

```typescript
const agentSelection = {
  firstMessage: 'onboarding',
  leadWithoutOnboarding: 'onboarding', 
  leadWithOnboarding: 'sales',
  existingUser: 'support'
};
```

## 📱 Integração Evolution API

### Envio de Mensagem
```bash
curl --request POST \
  --url https://evo-iafit.live.claudy.host/message/sendText/aleen \
  --header 'Content-Type: application/json' \
  --header 'apikey: YOUR_API_KEY' \
  --data '{
    "number": "5511999999999",
    "textMessage": {
      "text": "Mensagem para o usuário"
    },
    "options": {
      "delay": 2000,
      "presence": "composing"
    }
  }'
```

### Verificação de Saúde
```bash
curl --header 'apikey: YOUR_API_KEY' \
  https://evo-iafit.live.claudy.host/instance/connectionState/aleen
```

## 🔧 Serviços Implementados

### `SupabaseUserService`
- `checkUserStatus(telefone)` - Verifica status do usuário
- `createNewLead(telefone)` - Cria novo lead
- `getAgentByType(tipo)` - Busca agente por tipo
- `completeOnboarding(telefone)` - Marca onboarding como concluído

### `EvolutionApiService`
- `sendTextMessage(number, text, options)` - Envia mensagem
- `sendWelcomeMessage(number, name)` - Saudação padrão
- `sendAgentMessage(number, response, agentType)` - Resposta da IA
- `checkHealth()` - Verifica conexão

## 🧪 Testes

### Teste Completo
```bash
./test-complete-flow.sh
```

### Cenários de Teste

1. **Primeira Mensagem**
   ```json
   {
     "remoteJid": "5511987654321@s.whatsapp.net",
     "message": "Olá, quero conhecer a Aleen IA"
   }
   ```
   - Deve criar lead e enviar saudação

2. **Segunda Mensagem (mesmo usuário)**
   ```json
   {
     "remoteJid": "5511987654321@s.whatsapp.net", 
     "message": "Tenho uma empresa e preciso automatizar"
   }
   ```
   - Deve processar com Onboarding Agent

3. **Usuário Existente**
   ```json
   {
     "remoteJid": "5511999888777@s.whatsapp.net",
     "message": "Estou com problema na integração"
   }
   ```
   - Deve processar com Support Agent

## 📋 Logs e Monitoramento

### Logs Importantes
```typescript
// Verificação de usuário
logger.info('User status checked', {
  userNumber,
  isLead,
  isUser, 
  isFirstMessage,
  needsOnboarding,
  recommendedAgent
});

// Envio via Evolution
logger.info('WhatsApp message sent successfully', {
  number,
  messageId,
  agent
});
```

### Métricas
- Leads criados vs usuários existentes
- Taxa de sucesso Evolution API
- Tempo de resposta por agente
- Conversões onboarding → sales

## 🔐 Variáveis de Ambiente

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Evolution API
EVOLUTION_API_BASE_URL=https://evo-iafit.live.claudy.host
EVOLUTION_API_KEY=your_api_key
EVOLUTION_INSTANCE=aleen

# OpenAI (para processamento IA)
OPENAI_API_KEY=your_openai_key
```

## 🚨 Tratamento de Erros

### Fallbacks Implementados
1. **Supabase indisponível**: Assume primeira mensagem
2. **Evolution API falha**: Loga erro mas continua processamento
3. **OpenAI indisponível**: Envia mensagem padrão
4. **Agente não encontrado**: Usa agente onboarding

### Logs de Erro
```typescript
logger.error('Error checking user status', {
  error: error.message,
  telefone,
  fallbackAction: 'assume_first_message'
});
```

## 🔄 Próximos Passos

1. **Dashboard Analytics**: Métricas de conversão
2. **Histórico de Conversas**: Armazenar no Supabase
3. **Webhooks Personalizados**: Notificações de status
4. **A/B Testing**: Diferentes prompts de saudação
5. **Integração CRM**: Sincronização com sistemas externos

---

**Fluxo implementado com sucesso! 🎉**
