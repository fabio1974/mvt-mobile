# Como Testar FCM Localmente (Sem Google Play)

## 🎯 Opções de Teste

### 1️⃣ Via Firebase Console (MAIS FÁCIL)

**Passos:**
1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Selecione o projeto `zapi10-2e451`
3. Menu lateral → **Engage** → **Cloud Messaging**
4. Clique em **Send your first message**
5. Preencha:
   - **Notification title**: "Nova Entrega"
   - **Notification text**: "Teste FCM"
6. Clique em **Send test message**
7. Cole o **FCM token** do device
8. Clique em **Test**

**Como obter o FCM Token:**
```bash
# 1. Inicie o app
npx expo start

# 2. Abra o app no device/emulador
# 3. Procure nos logs por:
📱 FCM Token: dxxxxxxxxxxxxxx...
```

---

### 2️⃣ Via Script (test-fcm.sh)

**Passos:**

1. **Obter Server Key:**
   - Firebase Console → Project Settings (⚙️)
   - Aba **Cloud Messaging**
   - Copie **Server key**

2. **Obter FCM Token:**
   ```bash
   npx expo start
   # Veja nos logs: 📱 FCM Token: xxx
   ```

3. **Executar script:**
   ```bash
   ./test-fcm.sh "FCM_TOKEN_AQUI" "SERVER_KEY_AQUI"
   ```

**Exemplo:**
```bash
./test-fcm.sh \
  "d1234567890abcdef..." \
  "AAAAxxxxxx:APA91bF..."
```

---

### 3️⃣ Via Postman/Insomnia

**Endpoint:**
```
POST https://fcm.googleapis.com/fcm/send
```

**Headers:**
```
Authorization: key=SUA_SERVER_KEY
Content-Type: application/json
```

**Body:**
```json
{
  "to": "FCM_TOKEN_DO_DEVICE",
  "notification": {
    "title": "🚚 Nova Entrega",
    "body": "Teste FCM direto"
  },
  "data": {
    "type": "delivery_invite",
    "deliveryId": "123",
    "clientName": "Cliente Teste",
    "value": "45.00"
  },
  "priority": "high"
}
```

---

### 4️⃣ Development Build Local

**Para testar no device físico sem Google Play:**

```bash
# 1. Build local de desenvolvimento
npx expo prebuild --clean
npx expo run:android

# 2. Instala direto no device via USB
# (não precisa passar pela Google Play)
```

**Vantagens:**
- ✅ Testa em device real
- ✅ Não precisa publicar
- ✅ Debugging completo
- ✅ FCM funciona 100%

**Requisitos:**
- Device Android com USB Debugging ativado
- Cabo USB conectado

---

## 📱 Tipos de Build para Teste

### Development Build (Recomendado)
```bash
npx expo run:android
```
- Instala direto via USB
- Hot reload funciona
- Logs completos

### APK de Teste
```bash
cd android
./gradlew assembleRelease
```
- APK em: `android/app/build/outputs/apk/release/`
- Compartilha via WhatsApp/Email
- Instala manualmente

### EAS Build de Preview
```bash
eas build --profile preview --platform android
```
- Baixa APK da nuvem
- Não precisa do ambiente local configurado

---

## 🧪 Testar Diferentes Cenários

### 1. App em Foreground
```bash
# App aberto e ativo
./test-fcm.sh "TOKEN" "KEY"
# Deve aparecer como banner na tela
```

### 2. App em Background
```bash
# Minimize o app
# Execute o script
# Deve aparecer na barra de notificações
```

### 3. App Fechado (Quit State)
```bash
# Force close o app
# Execute o script
# Deve aparecer na barra de notificações
```

### 4. Com Data Payload
```json
{
  "to": "TOKEN",
  "data": {
    "type": "delivery_invite",
    "deliveryId": "123"
  }
}
```

---

## 🔍 Debug de FCM

### Verificar se FCM está funcionando:

```bash
# Android Logcat
adb logcat | grep -i firebase

# Expo logs
npx expo start
# Procure por:
# 📱 FCM Token: xxx
# 📩 Mensagem recebida em foreground
```

### Problemas Comuns:

**1. "No FCM token"**
- Verifique se google-services.json está correto
- Rebuild: `npx expo prebuild --clean`

**2. "Invalid server key"**
- Copie novamente do Firebase Console
- Verifique espaços extras

**3. "Token not found"**
- Token expirou
- Pegue novo token dos logs

**4. "Notification not received"**
- Verifique permissões de notificação
- Android: Settings → Apps → MVT → Notifications

---

## 🎯 Workflow Recomendado

1. **Desenvolvimento:**
   ```bash
   npx expo run:android
   # Testa direto no device via USB
   ```

2. **Teste com equipe:**
   ```bash
   eas build --profile preview --platform android
   # Compartilha APK gerado
   ```

3. **Produção:**
   ```bash
   eas build --profile production --platform android
   # Submit para Google Play
   ```

---

## 📝 Exemplo Completo

```bash
# 1. Iniciar app
npx expo start

# 2. Em outro terminal, abrir app no Android
# Pressionar 'a' no terminal do expo

# 3. Pegar token dos logs
# Copiar: 📱 FCM Token: dxxxxxxx...

# 4. Pegar Server Key do Firebase Console
# Project Settings → Cloud Messaging → Server key

# 5. Testar
./test-fcm.sh \
  "d1234567890abcdef..." \
  "AAAAxxxxxx:APA91bF..."

# 6. Verificar notificação no device
```

---

## 🔗 Links Úteis

- [Firebase Console](https://console.firebase.google.com)
- [FCM Testing](https://firebase.google.com/docs/cloud-messaging/android/first-message)
- [Expo Dev Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Test Notifications](https://firebase.google.com/docs/cloud-messaging/android/send-multiple)
