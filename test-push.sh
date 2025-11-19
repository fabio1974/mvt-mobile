#!/bin/bash

# Script para testar Push Notification do Expo
# Uso: ./test-push.sh "ExpoToken[seu_token_aqui]"

TOKEN=$1

if [ -z "$TOKEN" ]; then
  echo "❌ Erro: Token não fornecido"
  echo "Uso: ./test-push.sh \"ExpoToken[seu_token]\""
  exit 1
fi

echo "📱 Enviando notificação de teste..."
echo "🎯 Token: $TOKEN"
echo ""

curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"to\": \"$TOKEN\",
    \"title\": \"🚚 Teste de Push Notification\",
    \"body\": \"Esta é uma notificação de teste enviada via cURL\",
    \"data\": {
      \"type\": \"delivery_invite\",
      \"deliveryId\": \"test_$(date +%s)\",
      \"message\": \"Teste realizado em $(date '+%Y-%m-%d %H:%M:%S')\"
    },
    \"sound\": \"default\",
    \"priority\": \"high\",
    \"channelId\": \"delivery\"
  }" | jq '.'

echo ""
echo "✅ Requisição enviada!"
echo "👀 Verifique seu celular para ver a notificação"
