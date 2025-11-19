# Correção do Push Token

## 🔍 Problema Identificado

Você estava certo! O erro estava acontecendo **ANTES** de enviar o token para o seu backend.

### Fluxo Original (com erro):
```
1. App solicita permissão ✅
2. App tenta pegar token do Expo ❌ ERRO: "projectId": Invalid uuid
3. ❌ PARA AQUI - nunca chega ao seu backend
```

### Fluxo Corrigido:
```
1. App solicita permissão ✅
2. App tenta pegar token do Expo ✅ 
   - Se falhar e estiver em DEV: usa token MOCK
3. Envia token para SEU backend ✅
4. Você vê o CURL completo nos logs! ✅
```

## ✅ O Que Foi Corrigido

### 1. **Fallback para Token Mock em Desenvolvimento**
Se o Expo falhar ao gerar o token (problemas de projectId, Expo Go limitações, etc), o app usa um token mock em desenvolvimento:

```typescript
ExponentPushToken[MOCK_1730847123456_abc123xyz]
```

Isso permite que você **teste o envio para seu backend** mesmo sem ter um token Expo real.

### 2. **Logs Detalhados**
Agora você verá logs claros quando o token for enviado para SEU backend:

```
📡 =============== ENVIANDO TOKEN PUSH PARA SEU BACKEND ===============
📤 URL: http://192.168.1.116:8080/api/users/push-token
📦 Payload: {
  "token": "ExponentPushToken[xxxxx]",
  "platform": "ios",
  "deviceType": "mobile"
}
🔑 Token Preview: ExponentPushToken[xxxxx]...
📱 Platform: ios
💻 Device Type: mobile
===================================================================
```

E depois você verá o **CURL COMPLETO** gerado pelo middleware:

```bash
curl -X POST 'http://192.168.1.116:8080/api/users/push-token' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer SEU_TOKEN_JWT' \
  -d '{
  "token": "ExponentPushToken[xxxxx]",
  "platform": "ios",
  "deviceType": "mobile"
}'
```

## 🎯 Próximos Passos

1. **Recarregue o app** (pressione `r` no terminal Expo ou agite o iPhone)
2. **Clique em "Enviar Token Push"** (ou deixe o app fazer automaticamente)
3. **Veja nos logs:**
   - Token sendo gerado (real ou mock)
   - Payload sendo enviado
   - CURL completo para testar
   - Resposta do seu backend

## 📋 O Que Esperar no Backend

Seu backend deve receber um **POST** em `/api/users/push-token` com:

```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "ios",
  "deviceType": "mobile"
}
```

Headers:
```
Authorization: Bearer {JWT_DO_USUARIO}
Content-Type: application/json
```

## 🧪 Testando com Token Mock

Em desenvolvimento, se o Expo falhar, você verá:
```
⚠️ Erro ao obter Expo Push Token (usando mock)
🧪 Usando token MOCK para desenvolvimento: ExponentPushToken[MOCK_...]
```

O token mock será enviado normalmente para seu backend, permitindo que você teste a integração!

## 🚀 Produção

Em produção (quando fizer build nativo), o app:
- NÃO usará token mock
- Lançará erro se não conseguir token real
- Garantirá que apenas tokens válidos sejam enviados
