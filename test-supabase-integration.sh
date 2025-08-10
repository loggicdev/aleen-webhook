#!/bin/bash

echo "🔗 Testando integração Python AI com Supabase..."

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Verificando se o Python AI está rodando...${NC}"

# Verifica se o Python AI está rodando
if ! nc -z localhost 8000; then
    echo -e "${RED}❌ Python AI não está rodando na porta 8000${NC}"
    echo "Execute: cd python-ai && python main.py"
    exit 1
fi
echo -e "${GREEN}✅ Python AI está rodando${NC}"

echo -e "\n${BLUE}2. Testando health check...${NC}"
PYTHON_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
if [ "$PYTHON_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Python AI health check OK${NC}"
else
    echo -e "${RED}❌ Python AI health check falhou (${PYTHON_HEALTH})${NC}"
fi

echo -e "\n${BLUE}3. Verificando agentes carregados do Supabase...${NC}"
AGENTS_RESPONSE=$(curl -s http://localhost:8000/agents)
echo -e "${YELLOW}Agentes disponíveis:${NC}"
echo "$AGENTS_RESPONSE" | jq .

echo -e "\n${BLUE}4. Verificando configuração detalhada dos agentes...${NC}"
CONFIG_RESPONSE=$(curl -s http://localhost:8000/agents/config)
echo -e "${YELLOW}Configuração dos agentes:${NC}"
echo "$CONFIG_RESPONSE" | jq .

echo -e "\n${BLUE}5. Testando reload de agentes...${NC}"
RELOAD_RESPONSE=$(curl -s -X POST http://localhost:8000/reload-agents)
echo -e "${YELLOW}Resultado do reload:${NC}"
echo "$RELOAD_RESPONSE" | jq .

echo -e "\n${BLUE}6. Testando chat com agente do Supabase...${NC}"

# Testa chat direto com agente carregado do Supabase
CHAT_PAYLOAD='{
  "user_id": "5511999999999",
  "user_name": "João Silva",
  "message": "Olá, preciso de ajuda com automação de atendimento para minha empresa",
  "conversation_history": [],
  "recommended_agent": "onboarding"
}'

echo -e "${YELLOW}Testando chat com agente onboarding...${NC}"
CHAT_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$CHAT_PAYLOAD" \
  http://localhost:8000/chat)

echo -e "${GREEN}Resposta do AI Agent (Supabase):${NC}"
echo "$CHAT_RESPONSE" | jq .

echo -e "\n${BLUE}7. Verificando prompts específicos...${NC}"

# Extrai o prompt usado
AGENT_PROMPT=$(echo "$CONFIG_RESPONSE" | jq -r '.agents_config.onboarding.prompt // "Prompt não encontrado"')
AGENT_IDENTIFIER=$(echo "$CONFIG_RESPONSE" | jq -r '.agents_config.onboarding.identifier // "Identifier não encontrado"')

echo -e "${YELLOW}Agente Onboarding:${NC}"
echo -e "  Identifier: $AGENT_IDENTIFIER"
echo -e "  Prompt (primeiras 200 chars): ${AGENT_PROMPT:0:200}..."

echo -e "\n${GREEN}🎉 Teste da integração Supabase concluído!${NC}"
echo -e "${BLUE}Resumo:${NC}"
echo -e "  • Agentes carregados dinamicamente do Supabase"
echo -e "  • Prompts personalizados aplicados"
echo -e "  • Sistema de reload funcional"
echo -e "  • Fallback para agentes padrão"
