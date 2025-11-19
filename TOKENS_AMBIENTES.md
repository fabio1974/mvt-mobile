# Como Funcionam os Tokens Push em Diferentes Ambientes

## 🔄 Estratégia de Obtenção de Token

### 1. **Expo Go (Desenvolvimento)** 📱
```typescript
await Notifications.getExpoPushTokenAsync()
```
- **Sem** `projectId`
- Gera token REAL do Expo
- Formato: `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`
- **Funciona perfeitamente** para testes
- Expo pode enviar notificações de verdade!

**Exemplo de token:**
```
ExponentPushToken[jXN2DbfqF-Y7r3FwPmXJVG]
```

### 2. **Standalone/EAS Build (Produção)** 🚀
```typescript
await Notifications.getExpoPushTokenAsync({
  projectId: '550e8400-e29b-41d5-a629-446655440000',
})
```
- **Com** `projectId` válido
- Gera token REAL vinculado ao seu projeto
- Formato: `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`
- Usado em produção

### 3. **Web (PWA)** 🌐
- Usa Push API nativa do browser
- Gera endpoint FCM
- Formato diferente: `https://fcm.googleapis.com/fcm/send/...`

## ✅ O Código Atual

O código tenta **PRIMEIRO** sem projectId (Expo Go), se falhar tenta COM projectId (Standalone):

```typescript
try {
  // Tenta Expo Go (desenvolvimento)
  const tokenData = await Notifications.getExpoPushTokenAsync();
  token = tokenData.data;
} catch {
  // Tenta Standalone (produção)
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: '550e8400-e29b-41d5-a629-446655440000',
  });
  token = tokenData.data;
}
```

## 🎯 Resultado

### No Expo Go (iPhone agora):
✅ Token REAL gerado
✅ Mesmo formato de produção
✅ Funcional para testes
✅ Expo pode enviar notificações de teste

### Em Produção (EAS Build):
✅ Token REAL gerado
✅ Vinculado ao seu projeto
✅ Totalmente funcional

## 📤 O Que Seu Backend Recebe

**Desenvolvimento (Expo Go):**
```json
{
  "token": "ExponentPushToken[jXN2DbfqF-Y7r3FwPmXJVG]",
  "platform": "ios",
  "deviceType": "mobile"
}
```

**Produção (Standalone):**
```json
{
  "token": "ExponentPushToken[AbC123XyZ456...]",
  "platform": "ios", 
  "deviceType": "mobile"
}
```

## 🔔 Testando Notificações

Com o token REAL do Expo Go, você pode enviar notificações de teste usando a API do Expo:

```bash
curl -H "Content-Type: application/json" \
  -X POST https://exp.host/--/api/v2/push/send \
  -d '{
  "to": "ExponentPushToken[jXN2DbfqF-Y7r3FwPmXJVG]",
  "title": "Teste",
  "body": "Sua notificação!"
}'
```

Seu backend pode fazer isso para enviar notificações de verdade durante desenvolvimento!

## 🚀 Quando Fazer Build de Produção

Você só precisa fazer build standalone/EAS quando:
- Quiser publicar na App Store
- Precisar de funcionalidades nativas avançadas
- Quiser remover limitações do Expo Go

Para desenvolvimento e testes de notificações push, **Expo Go é suficiente**!

## 📋 Diferença Entre Ambientes

| Aspecto | Expo Go | Standalone Build |
|---------|---------|------------------|
| Token | Real ✅ | Real ✅ |
| Formato | Idêntico | Idêntico |
| Notificações | Funciona ✅ | Funciona ✅ |
| ProjectId | Não precisa | Precisa |
| Deploy | Não precisa | Precisa |
| Testes | Perfeito ✅ | Perfeito ✅ |

## ✨ Conclusão

**Você terá tokens REAIS em desenvolvimento!** Não é mock - é o mesmo sistema que rodará em produção, apenas sem o projectId específico.
