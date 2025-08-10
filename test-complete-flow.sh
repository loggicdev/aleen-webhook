#!/bin/bash

echo "🧪 Testando fluxo completo com Supabase e Evolution API..."

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Simulando primeira mensagem de um lead...${NC}"

# Simula webhook de primeira mensagem
FIRST_MESSAGE_PAYLOAD='{
  "event": "messages.upsert",
  "instance": "test-instance",
  "data": {
    "key": {
      "remoteJid": "5511987654321@s.whatsapp.net",
      "fromMe": false,
      "id": "first-message-' $(date +%s) '"
    },
    "messageTimestamp": ' $(date +%s) ',
    "pushName": "Maria Santos",
    "messageType": "conversation",
    "message": {
      "conversation": "Olá, quero conhecer a Aleen IA"
    },
    "instanceId": "test-instance",
    "source": "whatsapp"
  },
  "webhookUrl": "http://localhost:3000/webhook",
  "executionMode": "production"
}'

echo -e "${YELLOW}Enviando primeira mensagem (deve receber saudação)...${NC}"
FIRST_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$FIRST_MESSAGE_PAYLOAD" \
  http://localhost:3000/webhook)

echo -e "${GREEN}Resposta primeira mensagem:${NC}"
echo "$FIRST_RESPONSE" | jq .

echo -e "\n${BLUE}2. Aguardando processamento...${NC}"
sleep 12

echo -e "${BLUE}3. Simulando segunda mensagem do mesmo usuário...${NC}"

# Simula segunda mensagem do mesmo usuário
SECOND_MESSAGE_PAYLOAD='{
  "event": "messages.upsert",
  "instance": "test-instance", 
  "data": {
    "key": {
      "remoteJid": "5511987654321@s.whatsapp.net",
      "fromMe": false,
      "id": "second-message-' $(date +%s) '"
    },
    "messageTimestamp": ' $(date +%s) ',
    "pushName": "Maria Santos",
    "messageType": "conversation",
    "message": {
      "conversation": "Tenho uma empresa de vendas online e preciso automatizar o atendimento"
    },
    "instanceId": "test-instance",
    "source": "whatsapp"
  },
  "webhookUrl": "http://localhost:3000/webhook",
  "executionMode": "production"
}'

echo -e "${YELLOW}Enviando segunda mensagem (deve processar com IA)...${NC}"
SECOND_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$SECOND_MESSAGE_PAYLOAD" \
  http://localhost:3000/webhook)

echo -e "${GREEN}Resposta segunda mensagem:${NC}"
echo "$SECOND_RESPONSE" | jq .

echo -e "\n${BLUE}4. Testando usuário que já existe...${NC}"

# Simula mensagem de usuário existente
EXISTING_USER_PAYLOAD='{
  "event": "messages.upsert",
  "instance": "test-instance",
  "data": {
    "key": {
      "remoteJid": "5511999888777@s.whatsapp.net",
      "fromMe": false,
      "id": "existing-user-' $(date +%s) '"
    },
    "messageTimestamp": ' $(date +%s) ',
    "pushName": "João Cliente",
    "messageType": "conversation",
    "message": {
      "conversation": "Estou com problema na integração"
    },
    "instanceId": "test-instance",
    "source": "whatsapp"
  },
  "webhookUrl": "http://localhost:3000/webhook",
  "executionMode": "production"
}'

echo -e "${YELLOW}Enviando mensagem de usuário existente (deve ir para support)...${NC}"
EXISTING_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$EXISTING_USER_PAYLOAD" \
  http://localhost:3000/webhook)

echo -e "${GREEN}Resposta usuário existente:${NC}"
echo "$EXISTING_RESPONSE" | jq .

echo -e "\n${BLUE}5. Verificando Supabase diretamente...${NC}"

# Testa endpoints do Supabase
echo -e "${YELLOW}Consultando leads criados...${NC}"
# TODO: Adicionar consulta direta ao Supabase quando necessário

echo -e "\n${BLUE}6. Testando Evolution API health...${NC}"

# Verifica se Evolution API está respondendo
EVOLUTION_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: ${EVOLUTION_API_KEY:-test-key}" \
  "${EVOLUTION_API_BASE_URL:-http://localhost:3000}/instance/connectionState/${EVOLUTION_INSTANCE:-test}")

if [ "$EVOLUTION_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Evolution API conectada${NC}"
else
    echo -e "${RED}❌ Evolution API não conectada (${EVOLUTION_HEALTH})${NC}"
fi

echo -e "\n${GREEN}🎉 Teste do fluxo completo concluído!${NC}"
echo -e "${BLUE}Verifique os logs dos serviços para mais detalhes sobre:${NC}"
echo -e "  • Consultas ao Supabase"
echo -e "  • Mensagens enviadas via Evolution API"
echo -e "  • Processamento dos agentes IA"
echo -e "  • Status dos usuários (lead/user/onboarding)"
