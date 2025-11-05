# 🔔 Guia de Teste - Web Push Notifications

## ✅ Status Atual

### Backend

- ✅ Sistema híbrido 100% funcional
- ✅ VAPID keys configuradas
- ✅ Endpoint `/users/push-token` recebendo registros
- ✅ Serviço de envio Web Push funcionando

### Frontend

- ✅ Service Worker configurado (`/sw.js`)
- ✅ Push API nativa implementada
- ✅ Registro automático de tokens
- ✅ Logs de debug adicionados

## 🧪 Como Testar Web Push Notifications

### Passo 1: Registrar Token Push

1. **Acesse a aplicação no navegador** (localhost:8081)
2. **Faça login como motoboy** (motoboyA@gmail.com)
3. **Clique no botão "📧 Enviar Token Push"**
4. **Observe os logs no console**:

```javascript
🔔 [Web Push] Iniciando registro de Service Worker...
✅ [Web Push] Service Worker registrado com sucesso
✅ [Web Push] Service Worker está pronto
🔔 [Web Push] Solicitando permissão para notificações...
🔔 [Web Push] Permissão: granted
🔔 [Web Push] Criando push subscription com VAPID key...
✅ [Web Push] Push subscription criada!
📍 [Web Push] Endpoint: https://fcm.googleapis.com/fcm/send/[TOKEN_REAL_FCM]
📡 [Push Token] Enviando para backend...
✅ [Push Token] Token registrado no backend com sucesso!
```

### Passo 2: Verificar Registro no Backend

O backend deve receber:

```json
{
  "token": "https://fcm.googleapis.com/fcm/send/[TOKEN_REAL]",
  "platform": "web",
  "deviceType": "web",
  "subscriptionData": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/[TOKEN_REAL]",
    "keys": {
      "p256dh": "[KEY_P256DH]",
      "auth": "[KEY_AUTH]"
    }
  }
}
```

### Passo 3: Testar Envio de Notificação

Use o endpoint de teste do backend:

```bash
# Via Postman ou curl
POST http://localhost:8080/api/debug/test-real-web-push
Authorization: Bearer [SEU_JWT_TOKEN]
```

O backend irá:

1. Buscar seu token web push no banco
2. Enviar uma notificação real usando Web Push
3. Você verá a notificação no navegador!

## 🔍 Troubleshooting

### Problema: Permissão de Notificação Negada

**Solução:**

1. Abra as configurações do navegador
2. Vá em Configurações > Notificações
3. Permita notificações para `localhost:8081`
4. Recarregue a página e tente novamente

### Problema: Service Worker Não Registra

**Solução:**

1. Abra DevTools (F12)
2. Vá em Application > Service Workers
3. Clique em "Unregister" para desregistrar workers antigos
4. Recarregue a página
5. Clique novamente em "📧 Enviar Token Push"

### Problema: Endpoint É Fictício

Se você ver um endpoint como `https://fcm.googleapis.com/fcm/send/test-web-token`, isso significa que o navegador não está gerando um token real do FCM.

**Solução:**

1. Certifique-se de estar usando HTTPS (ou localhost)
2. Verifique se o VAPID public key está correto
3. Limpe o cache do navegador
4. Tente em outro navegador (Chrome/Firefox)

## 🎯 Fluxo Completo de Teste

### 1. Registro Inicial

```bash
# Usuário faz login
POST /api/auth/login
{
  "email": "motoboyA@gmail.com",
  "password": "senha123"
}

# Aplicação registra token push automaticamente
# (acontece em MainApp.tsx no useEffect)
```

### 2. Token Registrado no Backend

```sql
-- Verificar no banco de dados
SELECT * FROM user_push_tokens
WHERE user_id = '[SEU_USER_ID]'
AND device_type = 'web';
```

### 3. Simular Convite de Entrega

```bash
# Backend deve ter endpoint para simular convite
POST /api/debug/test-delivery-notification
{
  "userId": "[SEU_USER_ID]"
}
```

### 4. Notificação Aparece

- ✅ Navegador mostra notificação
- ✅ Service Worker processa evento
- ✅ Usuário pode clicar e interagir

## 📊 Logs Esperados

### Frontend (Console do Browser)

```
🔔 Service Worker para push notifications carregado
✅ Serviço de notificações inicializado
🔔 [Web Push] Iniciando registro de Service Worker...
✅ [Web Push] Service Worker registrado com sucesso
📍 [Web Push] Endpoint: https://fcm.googleapis.com/fcm/send/...
✅ [Push Token] Token registrado no backend com sucesso!
```

### Backend (Logs do Spring Boot)

```
🚀 ENVIANDO WEB PUSH REAL: Nova Entrega Disponível!
📍 ENDPOINT: https://fcm.googleapis.com/fcm/send/...
✅ Web Push REAL enviado com sucesso!
```

### Browser (DevTools > Application > Notifications)

```
Push notification recebida
Title: Nova Entrega Disponível!
Body: Entrega de Cliente X - R$ 25.00
```

## 🔑 Chaves VAPID Configuradas

### Public Key (Frontend)

```
BNNlUJ4F7XM9JzE0QtDXJZJhMHpIV7nz5A8XJZcHfLvI2qQJfGJP7UzZF3T8CQS2VZY4K9W3K8F8F3Q7L1M9X6Q
```

### Private Key (Backend - já configurado)

```
Configurada no application.properties do backend
```

## ✅ Checklist de Testes

- [ ] Service Worker carregado no navegador
- [ ] Permissão de notificações concedida
- [ ] Token push gerado com endpoint real do FCM
- [ ] Token enviado e registrado no backend
- [ ] Backend confirmou recebimento do token
- [ ] Endpoint de teste retorna sucesso
- [ ] Notificação aparece no navegador
- [ ] Clicar na notificação funciona

## 🎉 Resultado Esperado

Quando tudo estiver funcionando:

1. **Login** → Token registra automaticamente
2. **Nova entrega criada** → Backend envia notificação
3. **Browser recebe** → Mostra notificação visual
4. **Usuário clica** → Abre modal de convite de entrega

## 📱 Testando em Dispositivos Móveis

### Android Chrome

1. Acesse via IP da máquina (ex: http://192.168.1.10:8081)
2. Instale o "Adicionar à tela inicial" (PWA)
3. O navegador pedirá permissão para notificações
4. Teste normalmente

### iOS Safari

⚠️ **Limitação**: iOS Safari tem suporte limitado para Web Push

- Requer iOS 16.4+
- Funciona apenas com websites adicionados à tela inicial (PWA)
- Recomendado usar app nativo (Expo) para iOS

## 🔗 Links Úteis

- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [VAPID Keys](https://datatracker.ietf.org/doc/html/rfc8292)
