#!/bin/bash

echo "🚀 Iniciando teste da integração Python AI Agents..."

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Verificando se os serviços estão rodando...${NC}"

# Verifica se o Redis está rodando
if ! nc -z localhost 6379; then
    echo -e "${RED}❌ Redis não está rodando na porta 6379${NC}"
    echo "Execute: docker run -d -p 6379:6379 redis:7-alpine"
    exit 1
fi
echo -e "${GREEN}✅ Redis está rodando${NC}"

# Verifica se o Node.js está rodando
if ! nc -z localhost 3000; then
    echo -e "${RED}❌ Node.js não está rodando na porta 3000${NC}"
    echo "Execute: npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ Node.js está rodando${NC}"

# Verifica se o Python AI está rodando
if ! nc -z localhost 8000; then
    echo -e "${RED}❌ Python AI não está rodando na porta 8000${NC}"
    echo "Execute: cd python-ai && python main.py"
    exit 1
fi
echo -e "${GREEN}✅ Python AI está rodando${NC}"

echo -e "\n${BLUE}2. Testando endpoints individuais...${NC}"

# Testa health check do Node.js
echo "Testando Node.js health check..."
NODE_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$NODE_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Node.js health check OK${NC}"
else
    echo -e "${RED}❌ Node.js health check falhou (${NODE_HEALTH})${NC}"
fi

# Testa health check do Python AI
echo "Testando Python AI health check..."
PYTHON_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
if [ "$PYTHON_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Python AI health check OK${NC}"
else
    echo -e "${RED}❌ Python AI health check falhou (${PYTHON_HEALTH})${NC}"
fi

# Testa lista de agentes
echo "Testando lista de agentes..."
AGENTS_RESPONSE=$(curl -s http://localhost:8000/agents)
echo "Agentes disponíveis: $AGENTS_RESPONSE"

echo -e "\n${BLUE}3. Simulando webhook completo...${NC}"

# Simula um webhook do WhatsApp
WEBHOOK_PAYLOAD='{
  "event": "messages.upsert",
  "instance": "test-instance",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "test-message-id-' $(date +%s) '"
    },
    "messageTimestamp": ' $(date +%s) ',
    "pushName": "João Silva",
    "messageType": "conversation",
    "message": {
      "conversation": "Olá, preciso de ajuda com automação de atendimento para minha empresa"
    },
    "instanceId": "test-instance",
    "source": "whatsapp"
  },
  "webhookUrl": "http://localhost:3000/webhook",
  "executionMode": "production"
}'

echo "Enviando webhook para Node.js..."
echo "Payload: $WEBHOOK_PAYLOAD" | jq .

WEBHOOK_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$WEBHOOK_PAYLOAD" \
  http://localhost:3000/webhook)

echo -e "\n${GREEN}Resposta do webhook:${NC}"
echo "$WEBHOOK_RESPONSE" | jq .

echo -e "\n${BLUE}4. Testando diretamente o Python AI...${NC}"

# Testa chat direto com Python AI
CHAT_PAYLOAD='{
  "user_id": "5511999999999",
  "user_name": "João Silva",
  "message": "Olá, preciso de ajuda com automação de atendimento para minha empresa",
  "conversation_history": []
}'

echo "Testando chat direto com Python AI..."
CHAT_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$CHAT_PAYLOAD" \
  http://localhost:8000/chat)

echo -e "\n${GREEN}Resposta do AI Agent:${NC}"
echo "$CHAT_RESPONSE" | jq .

echo -e "\n${GREEN}🎉 Teste completo!${NC}"
echo -e "${BLUE}Verifique os logs dos serviços para mais detalhes${NC}"
