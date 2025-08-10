# Deploy no Dokploy - Aleen IA

## 📋 Configuração no Dokploy

### 0. Preparar Supabase (IMPORTANTE - Execute primeiro!)
1. Acesse seu projeto Supabase: https://qzzeewrkdruavnnecypl.supabase.co
2. Vá em **SQL Editor**
3. Execute o script `supabase-setup.sql` que está no repositório
4. Isso criará as tabelas: `leads`, `users`, `agents` com as colunas necessárias

### 1. Criar Application
1. **Create Application** → **Docker Compose**
2. **Name:** `aleen-ia`
3. **Source:** GitHub repository
4. **Repository:** `loggicdev/aleen-ia`
5. **Branch:** `main`
6. **Docker Compose Path:** `docker-compose.yml`

### 2. Environment Variables
⚠️ **IMPORTANTE:** Substitua os valores `your_*_here` pelas suas chaves reais no Dokploy.

Adicione as seguintes variáveis de ambiente no Dokploy:

```bash
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here
EVOLUTION_API_KEY=your_evolution_api_key_here
EVOLUTION_API_BASE_URL=https://evo-iafit.live.claudy.host
EVOLUTION_INSTANCE=aleen
WEBHOOK_SECRET=aleen_webhook_secret_2025
LOG_LEVEL=info
LOG_FORMAT=json
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_JWT_SECRET=your_supabase_jwt_secret_here
```

### 3. Portas e Domínio
- **Port:** 3000 (serviço principal Node.js)
- **Domain:** Configure seu domínio personalizado
- **SSL:** Habilitado automaticamente

### 4. Volumes
- `redis_data` será criado automaticamente para persistir dados do Redis

## 🚀 Serviços Incluídos

### `aleen-ia` (Node.js)
- **Porta:** 3000
- **Função:** API principal, webhooks, processamento de mensagens
- **Health Check:** `/health`

### `python-ai` (Python AI Agents)
- **Porta:** 8000 (interna)
- **Função:** Agentes de IA, processamento com OpenAI
- **Health Check:** `/health`

### `redis`
- **Porta:** 6379 (interna)
- **Função:** Cache, sessões, contexto de conversação
- **Persistência:** Volume `redis_data`

## 🔧 Comunicação Interna
- Node.js → Python AI: `http://python-ai:8000`
- Ambos → Redis: `redis://redis:6379`
- Externos → Node.js: `https://seu-dominio.com`

## 📊 Monitoramento
- **Logs:** Disponíveis no dashboard do Dokploy
- **Health Checks:** Configurados para todos os serviços
- **Restart Policy:** `unless-stopped`

## 🔄 Deploy
1. Configure as variáveis de ambiente
2. Clique em **Deploy**
3. Aguarde o build e deploy dos 3 serviços
4. Acesse via domínio configurado

## 🧪 Teste
```bash
# Health check
curl https://seu-dominio.com/health

# Webhook endpoint
curl https://seu-dominio.com/api/webhook/evolution
```
