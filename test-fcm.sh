#!/bin/bash

# Script para testar FCM Push Notification
# Uso: ./test-fcm.sh "FCM_TOKEN" "SERVER_KEY"
#
# Como obter:
# 1. FCM_TOKEN: Veja nos logs do app ao iniciar
# 2. SERVER_KEY: Firebase Console → Project Settings → Cloud Messaging → Server key

FCM_TOKEN=$1
SERVER_KEY=$2

if [ -z "$FCM_TOKEN" ]; then
  echo "❌ Erro: FCM Token não fornecido"
  echo ""
  echo "Uso: ./test-fcm.sh \"FCM_TOKEN\" \"SERVER_KEY\""
  echo ""
  echo "Como obter o FCM Token:"
  echo "  1. Abra o app no device/emulador"
  echo "  2. Veja os logs: npx expo start"
  echo "  3. Procure por: 📱 FCM Token: xxxx"
  echo ""
  echo "Como obter o Server Key:"
  echo "  1. Firebase Console → Project Settings"
  echo "  2. Cloud Messaging → Server key"
  exit 1
fi

if [ -z "$SERVER_KEY" ]; then
  echo "❌ Erro: Server Key não fornecida"
  echo ""
  echo "Como obter:"
  echo "  1. Firebase Console → Project Settings"
  echo "  2. Cloud Messaging → Server key"
  exit 1
fi

echo "📱 Enviando notificação FCM de teste..."
echo "🎯 Token: ${FCM_TOKEN:0:20}..."
echo ""

# Envia via FCM HTTP v1 API
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=$SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$FCM_TOKEN\",
    \"notification\": {
      \"title\": \"🚚 Nova Entrega Disponível\",
      \"body\": \"Teste FCM - Delivery #123\",
      \"sound\": \"default\",
      \"badge\": \"1\"
    },
    \"data\": {
      \"type\": \"delivery_invite\",
      \"deliveryId\": \"test_$(date +%s)\",
      \"clientName\": \"Cliente Teste\",
      \"value\": \"45.00\",
      \"address\": \"Rua Teste, 123\",
      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    },
    \"priority\": \"high\",
    \"content_available\": true
  }" | python3 -m json.tool

echo ""
echo "✅ Requisição FCM enviada!"
echo "👀 Verifique seu celular/emulador para ver a notificação"
echo ""
echo "💡 Dica: Veja os logs do app para debug:"
echo "   npx expo start"
