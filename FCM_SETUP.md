# Configuração FCM Nativa - Próximos Passos

## ✅ O que foi configurado:

1. **Pacotes instalados:**
   - `@react-native-firebase/app@23.7.0`
   - `@react-native-firebase/crashlytics@23.7.0`
   - `@react-native-firebase/messaging@23.7.0`

2. **Arquivos criados:**
   - `GoogleService-Info.plist` (iOS) - **PRECISA SER SUBSTITUÍDO**
   - `src/services/fcmService.ts` - Serviço FCM nativo

3. **app.json atualizado:**
   - Adicionado plugin `@react-native-firebase/app`
   - Adicionado plugin `@react-native-firebase/messaging`
   - Configurado `googleServicesFile` para iOS
   - Adicionado `remote-notification` em `UIBackgroundModes`

4. **MainApp.tsx atualizado:**
   - Integrado fcmService com notificationService
   - Setup de listeners para mensagens FCM
   - Envio automático de token para backend

## ⚠️ AÇÕES NECESSÁRIAS:

### 1. Substituir GoogleService-Info.plist

O arquivo criado é apenas um template. Você precisa:

1. Acessar [Firebase Console](https://console.firebase.google.com)
2. Selecionar o projeto `zapi10-2e451`
3. Ir em **Project Settings** (⚙️)
4. Na aba **General**, seção **Your apps**
5. Clicar em **Add app** → **iOS**
6. Bundle ID: `com.mvt.mobile.zapi10`
7. Baixar o `GoogleService-Info.plist` REAL
8. **Substituir** o arquivo na raiz do projeto

### 2. Rebuild do app nativo

```bash
# Android
npx expo prebuild --clean
npx expo run:android

# iOS (macOS apenas)
npx expo prebuild --clean
cd ios && pod install && cd ..
npx expo run:ios
```

### 3. Atualizar backend para FCM

O backend precisa usar o **Firebase Admin SDK** para enviar notificações FCM:

```typescript
// Backend - exemplo
import admin from 'firebase-admin';

await admin.messaging().send({
  token: userFcmToken,
  notification: {
    title: 'Nova Entrega',
    body: 'Você tem uma nova entrega disponível'
  },
  data: {
    type: 'delivery_invite',
    deliveryId: '123',
    // outros dados...
  }
});
```

### 4. Configurar APNs (iOS - Produção)

Para push notifications funcionarem no iOS em produção:

1. Apple Developer Account
2. Criar APNs Key
3. Fazer upload no Firebase Console
4. Seção: **Project Settings** → **Cloud Messaging** → **APNs Authentication Key**

## 📱 Como funciona agora:

### Android:
- FCM direto via `google-services.json`
- Sem intermediário Expo
- Mais confiável e rápido

### iOS:
- FCM via `GoogleService-Info.plist`
- Requer APNs key configurada no Firebase
- Mais controle sobre notificações

### Fluxo de notificação:

```
Backend → Firebase Cloud Messaging → Device
                                    ↓
                           fcmService.setupNotificationListeners
                                    ↓
                              MainApp recebe
                                    ↓
                            Abre modal de convite
```

## 🔄 Migração gradual:

O código mantém **expo-notifications** como fallback. Você pode:

1. Testar FCM primeiro
2. Se funcionar, remover expo-notifications depois
3. Ou manter ambos para web (expo) + mobile (FCM)

## 🧪 Testar FCM:

```bash
# Via Firebase Console
# Cloud Messaging → Send test message
# Adicionar FCM token do device
```

## 📝 Verificar token FCM:

O token é enviado automaticamente quando o app inicia. Verifique os logs:

```
📱 FCM Token: xxxx...
📤 Enviando FCM token para backend...
✅ FCM token enviado com sucesso
```

## 🚨 Problemas comuns:

1. **"No matching client found"**: GoogleService-Info.plist incorreto
2. **"MissingPluginException"**: Precisa rebuild nativo (`expo prebuild`)
3. **iOS não recebe**: APNs key não configurada
4. **Android não recebe**: google-services.json incorreto

## 📚 Documentação:

- [React Native Firebase](https://rnfirebase.io/)
- [FCM Setup](https://rnfirebase.io/messaging/usage)
- [Firebase Console](https://console.firebase.google.com)
