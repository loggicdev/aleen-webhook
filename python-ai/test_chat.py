#!/usr/bin/env python3

import requests
import json

# URL do endpoint
url = "http://localhost:8001/chat"

# Dados de teste
test_data = {
    "user_id": "test_user_123",
    "user_name": "João",
    "message": "Olá, sou novo aqui",
    "conversation_history": [],
    "recommended_agent": "onboarding"
}

print("🧪 Testando endpoint /chat...")
print(f"📨 Enviando: {test_data}")

try:
    response = requests.post(url, json=test_data, timeout=30)
    
    print(f"📊 Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Sucesso!")
        print(f"🤖 Agente usado: {data.get('agent_used')}")
        print(f"📝 Resposta: {data.get('response')}")
        
        # Verifica se a resposta não é o prompt
        response_text = data.get('response', '')
        prompt_indicators = ['you are aleen', 'intelligent fitness', '*about aleen*', '*behavior*', '*rules*']
        is_prompt = any(indicator in response_text.lower() for indicator in prompt_indicators)
        
        if is_prompt:
            print("❌ ERRO: A resposta ainda contém o prompt!")
        else:
            print("✅ SUCESSO: A resposta é uma mensagem válida!")
            
    else:
        print(f"❌ Erro: {response.status_code}")
        print(f"📝 Resposta: {response.text}")
        
except requests.exceptions.ConnectionError:
    print("❌ Erro: Não foi possível conectar ao servidor. Certifique-se de que o servidor está rodando.")
except Exception as e:
    print(f"❌ Erro: {e}")
