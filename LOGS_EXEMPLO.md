# Exemplo de Logs do API Interceptor

## REQUEST - Sucesso

```
🚀 =============== REQUEST ===============
📤 POST /users/push-token
📍 Base URL: http://192.168.1.116:8080/api
📋 Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
📦 Body: {
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "ios",
  "deviceType": "mobile"
}

🔧 CURL Equivalente:
curl -X POST 'http://192.168.1.116:8080/api/users/push-token' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -d '{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "ios",
  "deviceType": "mobile"
}'
========================================
```

## RESPONSE - Sucesso

```
✅ =============== RESPONSE ===============
📥 POST /users/push-token
📊 Status: 200 OK
📋 Headers: {
  "content-type": "application/json",
  "date": "Wed, 05 Nov 2025 12:00:00 GMT"
}
📦 Data: {
  "success": true,
  "message": "Token registrado com sucesso"
}
=========================================
```

## ERROR - Falha

```
❌ =============== ERROR ===============
🔴 POST /users/push-token
📊 Status: 400 Bad Request
📋 Response Headers: {
  "content-type": "application/json"
}
📦 Response Data: {
  "error": "Invalid token format",
  "message": "O token push fornecido é inválido"
}
💬 Error Message: Request failed with status code 400
📤 Request Data: {
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "ios",
  "deviceType": "mobile"
}

🔧 CURL para reproduzir:
curl -X POST 'http://192.168.1.116:8080/api/users/push-token' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -d '{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "ios",
  "deviceType": "mobile"
}'
=======================================
```

## Benefícios

✅ **Todas as requisições** são logadas automaticamente
✅ **Comando curl pronto** para copiar e testar
✅ **Headers completos** incluindo Authorization
✅ **Request e Response** lado a lado
✅ **Erros detalhados** com todos os dados para debug
✅ **Apenas em modo DEV** (não afeta produção)
