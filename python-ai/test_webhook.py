#!/usr/bin/env python3

import requests
import json

# URL do endpoint do serviço principal (TypeScript)
url = "http://localhost:3000/api/webhook/evolution"

# Dados de teste simulando uma mensagem de primeira vez
test_data = {
    "event": "messages.upsert",
    "instance": "aleen",
    "apikey": "test-key",
    "data": {
        "instanceId": "test-instance",
        "source": "android",
        "key": {
            "fromMe": False,
            "id": "test-message-id",
            "remoteJid": "5511994072477@s.whatsapp.net"
        },
        "messageTimestamp": 1754797125,
        "messageType": "conversation",
        "pushName": "Icaro Rocha Test",
        "message": {
            "conversation": "Oi"
        }
    }
}

print("🧪 Testando webhook /evolution com TypeScript...")
print(f"📨 Enviando: {json.dumps(test_data, indent=2)}")

try:
    response = requests.post(url, json=test_data, timeout=30)
    
    print(f"📊 Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Sucesso!")
        print(f"📝 Resposta: {json.dumps(data, indent=2)}")
        
    else:
        print(f"❌ Erro: {response.status_code}")
        print(f"📝 Resposta: {response.text}")
        
except requests.exceptions.ConnectionError:
    print("❌ Erro: Não foi possível conectar ao servidor. Certifique-se de que o servidor está rodando.")
except Exception as e:
    print(f"❌ Erro: {e}")
