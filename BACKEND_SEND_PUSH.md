# Como Enviar Push Notifications do Backend

## 📱 Requisitos

O frontend já está configurado e pronto para receber notificações.

## 🚀 Enviar do Backend (Node.js/Express)

### Opção 1: Usando `expo-server-sdk`

```bash
npm install expo-server-sdk
```

```javascript
const { Expo } = require('expo-server-sdk');

// Cria um cliente Expo
const expo = new Expo();

async function sendPushNotification(userPushToken, deliveryData) {
  // Verifica se o token é válido
  if (!Expo.isExpoPushToken(userPushToken)) {
    console.error(`Token inválido: ${userPushToken}`);
    return;
  }

  // Cria a mensagem
  const message = {
    to: userPushToken,
    sound: 'default',
    title: '🚚 Nova Entrega Disponível!',
    body: 'Você recebeu um convite para uma nova entrega',
    data: {
      type: 'delivery_invite',
      deliveryId: deliveryData.id,
      message: 'Nova entrega próxima à sua localização'
    },
    priority: 'high',
    channelId: 'delivery', // Android
  };

  try {
    // Envia a notificação
    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];

    for (let chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log('📤 Push enviado:', ticketChunk);
      tickets.push(...ticketChunk);
    }

    // Verifica por erros
    for (let ticket of tickets) {
      if (ticket.status === 'error') {
        console.error('❌ Erro ao enviar push:', ticket.message);
      } else {
        console.log('✅ Push enviado com sucesso!');
      }
    }

    return tickets;
  } catch (error) {
    console.error('❌ Erro ao enviar notificação:', error);
    throw error;
  }
}

// Exemplo de uso
const userToken = 'ExpoToken[DEV_1762395815097_2p0xsxqbk]';
const delivery = {
  id: '123',
  pickup: 'Rua A, 123',
  dropoff: 'Rua B, 456'
};

sendPushNotification(userToken, delivery);
```

### Opção 2: HTTP Request direto (sem biblioteca)

```javascript
const axios = require('axios');

async function sendPushNotification(userPushToken, title, body, data) {
  try {
    const response = await axios.post('https://exp.host/--/api/v2/push/send', {
      to: userPushToken,
      title: title,
      body: body,
      data: data,
      sound: 'default',
      priority: 'high',
      channelId: 'delivery'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('✅ Push enviado:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao enviar push:', error.response?.data || error.message);
    throw error;
  }
}

// Exemplo de uso
sendPushNotification(
  'ExpoToken[DEV_1762395815097_2p0xsxqbk]',
  '🚚 Nova Entrega!',
  'Você tem uma entrega disponível',
  {
    type: 'delivery_invite',
    deliveryId: '123',
    message: 'Entrega próxima a você'
  }
);
```

## 🧪 Testar com cURL

```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExpoToken[DEV_1762395815097_2p0xsxqbk]",
    "title": "🚚 Teste de Push",
    "body": "Esta é uma notificação de teste",
    "data": {
      "type": "delivery_invite",
      "deliveryId": "test123"
    },
    "sound": "default",
    "priority": "high"
  }'
```

## 📊 Resposta Esperada

### Sucesso
```json
{
  "data": [
    {
      "status": "ok",
      "id": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
    }
  ]
}
```

### Erro - Token Inválido
```json
{
  "data": [
    {
      "status": "error",
      "message": "\"ExpoToken[...]\" is not a registered push notification recipient",
      "details": {
        "error": "DeviceNotRegistered"
      }
    }
  ]
}
```

## 🔍 Verificar Recebimento no App

Quando a notificação for enviada, o app deve:

1. **App em Foreground** (aberto):
   - Notificação aparece no topo da tela
   - Log: `🚚 Convite de entrega recebido: {...}`

2. **App em Background** (minimizado):
   - Notificação aparece na bandeja
   - Ao tocar, abre o app

3. **App Fechado**:
   - Notificação aparece na bandeja
   - Ao tocar, abre o app
   - Log: `👆 Usuário tocou na notificação: {...}`

## 🎯 Integração no Backend

### Quando enviar notificação?

1. **Nova entrega disponível próxima ao motoboy**
```javascript
// Quando criar uma nova entrega
const nearbyDrivers = await findDriversNearLocation(delivery.pickupLocation);

for (const driver of nearbyDrivers) {
  if (driver.pushToken) {
    await sendPushNotification(driver.pushToken, {
      id: delivery.id,
      pickup: delivery.pickupAddress,
      dropoff: delivery.dropoffAddress
    });
  }
}
```

2. **Entrega aceita por outro motoboy**
```javascript
// Quando um motoboy aceitar a entrega
const otherInvitedDrivers = await getInvitedDrivers(deliveryId);

for (const driver of otherInvitedDrivers) {
  if (driver.pushToken) {
    await sendPushNotification(driver.pushToken, {
      title: 'Entrega já aceita',
      body: 'A entrega foi aceita por outro motoboy',
      data: { type: 'delivery_cancelled', deliveryId }
    });
  }
}
```

3. **Cliente cancelou a entrega**
```javascript
// Quando cliente cancelar
if (assignedDriver.pushToken) {
  await sendPushNotification(assignedDriver.pushToken, {
    title: 'Entrega cancelada',
    body: 'O cliente cancelou a entrega',
    data: { type: 'delivery_cancelled', deliveryId }
  });
}
```

## 🚨 Tratamento de Erros

### DeviceNotRegistered
Token não é mais válido (usuário desinstalou app ou fez logout).
**Ação**: Remover token do banco de dados.

```javascript
if (ticket.details?.error === 'DeviceNotRegistered') {
  await removeUserPushToken(userId);
}
```

### MessageTooBig
Payload da notificação excede 4KB.
**Ação**: Reduzir tamanho do `data`.

### MessageRateExceeded
Muitas notificações enviadas muito rápido.
**Ação**: Implementar rate limiting.

## 📝 Estrutura do `data` para cada tipo

### delivery_invite
```javascript
{
  type: 'delivery_invite',
  deliveryId: 'abc123',
  message: 'Nova entrega disponível',
  pickup: { lat: -3.856, lng: -40.921 },
  dropoff: { lat: -3.860, lng: -40.925 },
  distance: 1.5, // km
  estimatedEarning: 12.50
}
```

### delivery_update
```javascript
{
  type: 'delivery_update',
  deliveryId: 'abc123',
  status: 'picked_up',
  message: 'Pedido coletado'
}
```

### delivery_cancelled
```javascript
{
  type: 'delivery_cancelled',
  deliveryId: 'abc123',
  reason: 'Cliente cancelou',
  message: 'Entrega cancelada'
}
```

## 🎨 Customização de Notificações

### Som Customizado
```javascript
{
  sound: 'custom_sound.wav', // Precisa estar nos assets do app
}
```

### Prioridade
```javascript
{
  priority: 'high',  // high, normal, default
}
```

### Badge (iOS)
```javascript
{
  badge: 5, // Número no ícone do app
}
```

### Time to Live
```javascript
{
  ttl: 3600, // Segundos (1 hora)
  expiration: Math.floor(Date.now() / 1000) + 3600
}
```

## 🔐 Segurança

1. **Nunca expor tokens publicamente**
2. **Validar tokens antes de enviar**
3. **Limitar rate de notificações por usuário**
4. **Remover tokens inválidos do banco**
5. **Não enviar dados sensíveis no payload**

## 📊 Monitoramento

```javascript
// Logs úteis
console.log('📤 Enviando push para:', userToken);
console.log('📦 Payload:', JSON.stringify(message, null, 2));
console.log('✅ Resposta Expo:', ticket);
console.log('📊 Status:', ticket.status);

// Métricas importantes
- Total de notificações enviadas
- Taxa de sucesso/erro
- Tempo de resposta do Expo
- Tokens inválidos encontrados
```

## 🧪 Testar Agora

1. **Pegue o token do console do app**:
   ```
   ✅ Token Expo real obtido: ExpoToken[...]
   ```

2. **Use o cURL acima** substituindo o token

3. **Veja a notificação aparecer no celular**!

4. **Verifique os logs no app** para confirmar recebimento

## ✅ Checklist

- [ ] Backend tem o token do usuário no banco
- [ ] Backend usa `expo-server-sdk` ou faz request HTTP
- [ ] Notificação tem `to`, `title`, `body` e `data`
- [ ] Token é válido (formato `ExpoToken[...]`)
- [ ] App está rodando (foreground ou background)
- [ ] Permissões de notificação concedidas
- [ ] Teste com cURL funcionou
- [ ] Integração no fluxo de negócio implementada
