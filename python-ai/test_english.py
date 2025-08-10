#!/usr/bin/env python3

import requests
import json

# URL do endpoint
url = "http://localhost:8001/chat"

# Teste em inglês
test_data_en = {
    "user_id": "test_user_456",
    "user_name": "John",
    "message": "Hello, I'm interested in learning more",
    "conversation_history": [],
    "recommended_agent": "onboarding"
}

print("🧪 Testando endpoint /chat em inglês...")
print(f"📨 Enviando: {test_data_en}")

try:
    response = requests.post(url, json=test_data_en, timeout=30)
    
    print(f"📊 Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Sucesso!")
        print(f"🤖 Agente usado: {data.get('agent_used')}")
        print(f"📝 Resposta: {data.get('response')}")
        
        # Verifica se respondeu em inglês
        response_text = data.get('response', '')
        english_indicators = ['I am', 'I create', 'would you like', 'how it works']
        portuguese_indicators = ['Eu sou', 'Eu crio', 'você gostaria', 'como funciona']
        
        has_english = any(indicator.lower() in response_text.lower() for indicator in english_indicators)
        has_portuguese = any(indicator.lower() in response_text.lower() for indicator in portuguese_indicators)
        
        if has_english and not has_portuguese:
            print("✅ PERFEITO: Respondeu em inglês como esperado!")
        elif has_portuguese:
            print("⚠️ AVISO: Respondeu em português para mensagem em inglês")
        else:
            print("ℹ️ Resposta neutra (sem indicadores claros de idioma)")
            
    else:
        print(f"❌ Erro: {response.status_code}")
        print(f"📝 Resposta: {response.text}")
        
except Exception as e:
    print(f"❌ Erro: {e}")
