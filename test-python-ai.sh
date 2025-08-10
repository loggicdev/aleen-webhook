#!/bin/bash

echo "🔍 Testando comunicação com o serviço Python AI..."

# Teste 1: Health check
echo "📋 1. Testando health check..."
curl -s http://python-ai:8000/health || echo "❌ Health check falhou"

# Teste 2: Listar agentes
echo -e "\n📋 2. Listando agentes disponíveis..."
curl -s http://python-ai:8000/agents || echo "❌ Listagem de agentes falhou"

# Teste 3: Teste de chat simples
echo -e "\n📋 3. Teste de chat..."
curl -s -X POST http://python-ai:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "user_name": "Test User", 
    "message": "Olá, preciso de ajuda"
  }' || echo "❌ Teste de chat falhou"

echo -e "\n✅ Teste concluído"
