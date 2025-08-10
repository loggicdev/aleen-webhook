#!/bin/bash

echo "🔍 Diagnóstico do Serviço Python AI na VPS"
echo "=========================================="
echo

# Verifica se os containers estão rodando
echo "📦 Verificando containers Docker:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(python-ai|aleen)"
echo

# Verifica logs do container python-ai
echo "📋 Logs do container python-ai (últimas 20 linhas):"
docker logs --tail 20 python-ai 2>&1 || echo "❌ Container python-ai não encontrado"
echo

# Testa conectividade interna do Docker
echo "🌐 Testando conectividade interna Docker:"
docker exec aleen-ia curl -s --max-time 5 http://python-ai:8000/health || echo "❌ Conexão interna falhou"
echo

# Verifica se a porta 8000 está aberta no container
echo "🔍 Verificando processo na porta 8000 do python-ai:"
docker exec python-ai netstat -tulpn | grep :8000 || echo "❌ Porta 8000 não está sendo escutada"
echo

# Testa endpoint direto na porta exposta
echo "🌐 Testando endpoint direto na porta exposta:"
curl -s --max-time 5 http://localhost:8000/health || echo "❌ Endpoint externo não acessível"
echo

# Verifica variáveis de ambiente
echo "⚙️ Variáveis de ambiente do container aleen-ia:"
docker exec aleen-ia env | grep -E "(PYTHON_AI|REDIS|OPENAI)" | sort
echo

echo "🏁 Diagnóstico concluído!"
echo "Se o serviço Python AI não estiver funcionando, execute:"
echo "  docker-compose restart python-ai"
echo "  docker-compose logs -f python-ai"
