#!/bin/bash
# 🧪 Teste Rápido - Node.js API

echo "🚀 Testando Node.js API..."

# Determinar URL baseado no ambiente
if [ "$1" = "prod" ]; then
    BASE_URL="https://api-aleen.live.claudy.host"
    echo "🌐 Testando em PRODUÇÃO: $BASE_URL"
else
    BASE_URL="http://localhost:3000"
    echo "🔧 Testando em LOCAL: $BASE_URL"
fi

# Teste 1: Health Check
echo "1️⃣ Testando Health Check..."
curl -s $BASE_URL/api/webhook/health | jq '.' 2>/dev/null || curl -s $BASE_URL/api/webhook/health

echo ""

# Teste 2: Ping
echo "2️⃣ Testando Ping..."
curl -s $BASE_URL/api/webhook/test | jq '.' 2>/dev/null || curl -s $BASE_URL/api/webhook/test

echo ""
echo "✅ Testes concluídos!"
echo ""
echo "📝 Para testar webhooks, use:"
echo "curl -X POST $BASE_URL/api/webhook/evolution -H 'Content-Type: application/json' -d '{\"test\": true}'"
