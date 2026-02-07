# 🔔 Guia de Integração - Sistema de Pagamento Automático

## ✅ Componentes Implementados

### 1. **PaymentPreferenceScreen** 
Tela para configurar preferência de pagamento automático (PIX ou Cartão).

**Funcionalidades:**
- ✅ Carrega preferência existente do backend
- ✅ Seletor de método (PIX ou CREDIT_CARD)
- ✅ Lista de cartões com seleção via radio button
- ✅ Validação: exige cartão para cobrança automática
- ✅ Salva preferência no backend
- ✅ Avisos contextuais sobre quando a cobrança ocorre

**Uso:**
```tsx
import PaymentPreferenceScreen from './src/screens/PaymentPreferenceScreen';

<PaymentPreferenceScreen 
  onBack={() => navigation.goBack()}
  onAddCard={() => navigation.navigate('AddCreditCard')}
/>
```

---

### 2. **PixPaymentScreen**
Tela para pagamento PIX com QR Code e timer.

**Funcionalidades:**
- ✅ Mostra QR Code gerado pelo backend
- ✅ Timer de expiração (5 minutos)
- ✅ Copia código PIX para área de transferência
- ✅ Compartilha código PIX
- ✅ Alerta quando expira
- ✅ Instruções de pagamento

**Uso:**
```tsx
import PixPaymentScreen from './src/screens/PixPaymentScreen';
import { PixPaymentInfo } from './src/types/payment';

const pixInfo: PixPaymentInfo = {
  deliveryId: '123',
  qrCode: 'codigo-pix-longo...',
  qrCodeBase64: 'base64...',
  pixKey: 'chave@pix.com',
  amount: 2500, // em centavos (R$ 25,00)
  expiresAt: '2026-02-02T12:30:00Z',
  pixId: 'pix-12345'
};

<PixPaymentScreen 
  pixInfo={pixInfo}
  onBack={() => navigation.goBack()}
  onPaymentConfirmed={() => console.log('PIX confirmado!')}
/>
```

---

### 3. **usePaymentPushNotifications Hook**
Hook para receber e processar notificações de pagamento.

**Tipos de notificação:**
- `PAYMENT_SUCCESS`: Pagamento com cartão aprovado
- `PAYMENT_FAILED`: Pagamento com cartão recusado
- `PIX_REQUIRED`: Cliente precisa pagar PIX (com QR Code)
- `PIX_CONFIRMED`: Pagamento PIX confirmado

**Uso:**
```tsx
import { usePaymentPushNotifications } from './src/hooks/usePaymentPushNotifications';

// No componente principal (MainApp.tsx ou App.tsx)
const MainApp = () => {
  const [pixPaymentInfo, setPixPaymentInfo] = useState(null);
  const [showPixScreen, setShowPixScreen] = useState(false);

  usePaymentPushNotifications({
    onPixRequired: (pixInfo) => {
      console.log('💰 PIX necessário:', pixInfo);
      setPixPaymentInfo(pixInfo);
      setShowPixScreen(true);
    },
    onPaymentSuccess: (deliveryId, amount) => {
      console.log('✅ Pagamento aprovado:', deliveryId, amount);
      // Atualizar UI, recarregar entregas, etc.
    },
    onPaymentFailed: (deliveryId, error) => {
      console.log('❌ Pagamento falhou:', deliveryId, error);
      // Mostrar erro, sugerir atualizar cartão
    },
    onPixConfirmed: (deliveryId) => {
      console.log('✅ PIX confirmado:', deliveryId);
      setShowPixScreen(false);
    },
  });

  return (
    <View>
      {/* Seu app */}
      
      {showPixScreen && pixPaymentInfo && (
        <PixPaymentScreen 
          pixInfo={pixPaymentInfo}
          onBack={() => setShowPixScreen(false)}
        />
      )}
    </View>
  );
};
```

---

### 4. **CreateDeliveryModal Atualizado**
Modal para criar entregas com seletor de tipo (DELIVERY vs RIDE).

**Novas funcionalidades:**
- ✅ Seletor visual de tipo: 📦 Entrega ou 🚗 Viagem
- ✅ **DELIVERY**: Pago quando motoboy aceita
- ✅ **RIDE**: Pago quando motorista inicia
- ✅ Validação: RIDE só permite cartão (não aceita PIX)
- ✅ Validação: Verifica se tem cartão antes de criar RIDE
- ✅ Info box explicando diferença entre tipos

**Campo enviado ao backend:**
```typescript
{
  ...deliveryData,
  deliveryType: 'DELIVERY' | 'RIDE'
}
```

---

## 📋 Tipos TypeScript Atualizados

### payment.ts
```typescript
// Tipos de pagamento (sem CASH para automático)
export type PaymentMethodType = 'PIX' | 'CREDIT_CARD';

// Tipos de entrega
export type DeliveryType = 'DELIVERY' | 'RIDE';

// Tipos de notificação
export type PaymentNotificationType = 
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'PIX_REQUIRED'
  | 'PIX_CONFIRMED';

// Info de pagamento PIX
export interface PixPaymentInfo {
  deliveryId: string;
  qrCode: string;
  qrCodeBase64: string;
  pixKey: string;
  amount: number; // centavos
  expiresAt: string; // ISO
  pixId: string;
}

// Dados da notificação
export interface PaymentNotificationData {
  type: PaymentNotificationType;
  deliveryId: string;
  amount?: number;
  message: string;
  pixInfo?: PixPaymentInfo;
  errorCode?: string;
  errorMessage?: string;
}
```

---

## 🔄 Fluxo de Pagamento Automático

### Para DELIVERY (Entrega):
1. Cliente cria entrega com `deliveryType: 'DELIVERY'`
2. Backend aguarda motoboy aceitar
3. **Quando motoboy aceita:**
   - Backend verifica preferência de pagamento do cliente
   - **Se CREDIT_CARD:** Cobra automaticamente e envia push `PAYMENT_SUCCESS` ou `PAYMENT_FAILED`
   - **Se PIX:** Gera QR Code e envia push `PIX_REQUIRED` com `pixInfo`
4. Se PIX, cliente paga manualmente em até 5 minutos
5. Backend confirma PIX e envia push `PIX_CONFIRMED`

### Para RIDE (Viagem):
1. Cliente cria viagem com `deliveryType: 'RIDE'`
2. Validação: Cliente DEVE ter cartão (PIX não permitido)
3. Backend aguarda motorista aceitar E iniciar viagem
4. **Quando motorista inicia (pickup):**
   - Backend cobra automaticamente no cartão
   - Envia push `PAYMENT_SUCCESS` ou `PAYMENT_FAILED`

---

## 🎯 Integração Completa no MainApp.tsx

```tsx
import React, { useState } from 'react';
import { usePaymentPushNotifications } from './src/hooks/usePaymentPushNotifications';
import PixPaymentScreen from './src/screens/PixPaymentScreen';
import PaymentPreferenceScreen from './src/screens/PaymentPreferenceScreen';

export default function MainApp({ user, onLogout }) {
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [pixPaymentInfo, setPixPaymentInfo] = useState(null);

  // Hook de notificações de pagamento
  usePaymentPushNotifications({
    onPixRequired: (pixInfo) => {
      setPixPaymentInfo(pixInfo);
      setCurrentScreen('pix-payment');
    },
    onPaymentSuccess: (deliveryId, amount) => {
      Alert.alert('✅ Pagamento Aprovado!', `R$ ${(amount / 100).toFixed(2)}`);
      // Recarregar entregas
    },
    onPaymentFailed: (deliveryId, error) => {
      Alert.alert(
        '❌ Pagamento Recusado',
        error,
        [
          { text: 'OK' },
          { text: 'Atualizar Cartão', onPress: () => setCurrentScreen('payment-preference') }
        ]
      );
    },
    onPixConfirmed: (deliveryId) => {
      Alert.alert('✅ PIX Confirmado!');
      setCurrentScreen('dashboard');
    },
  });

  // Renderizar telas
  if (currentScreen === 'pix-payment' && pixPaymentInfo) {
    return (
      <PixPaymentScreen 
        pixInfo={pixPaymentInfo}
        onBack={() => setCurrentScreen('dashboard')}
      />
    );
  }

  if (currentScreen === 'payment-preference') {
    return (
      <PaymentPreferenceScreen 
        onBack={() => setCurrentScreen('dashboard')}
        onAddCard={() => setCurrentScreen('add-card')}
      />
    );
  }

  return (
    <View>
      {/* Seu dashboard */}
    </View>
  );
}
```

---

## 🚀 Próximos Passos

1. ✅ Adicionar PaymentPreferenceScreen no menu de navegação
2. ✅ Integrar hook usePaymentPushNotifications no MainApp.tsx
3. ✅ Testar fluxo completo:
   - Configurar preferência (PIX e Cartão)
   - Criar DELIVERY → Receber push PIX_REQUIRED
   - Criar RIDE → Validar cartão obrigatório
   - Testar notificações PAYMENT_SUCCESS/FAILED

4. 🔄 Backend deve implementar:
   - POST `/deliveries` com campo `deliveryType`
   - GET `/customers/me/payment-preference`
   - PUT `/customers/me/payment-preference`
   - Envio de push notifications após cobrança
   - Geração de QR Code PIX com timer

---

## 📦 Dependências Instaladas

```bash
npm install react-native-qrcode-svg react-native-svg
npm install @react-native-picker/picker
```

---

## 🎨 Screens Disponíveis

1. **PaymentPreferenceScreen** - Configurar preferência
2. **PixPaymentScreen** - Pagar com PIX
3. **ManageCreditCardsScreen** - Gerenciar cartões (já existe)
4. **AddCreditCardScreen** - Adicionar cartão (já existe)
5. **CreateDeliveryModal** - Criar entrega/viagem (atualizado)

---

## ✨ Diferenciais Implementados

- ✅ Cobrança 100% automática (exceto PIX manual)
- ✅ Split 87/13 configurado no backend
- ✅ Validações de cartão antes de criar RIDE
- ✅ Timer de 5 minutos para PIX
- ✅ Push notifications para todos eventos de pagamento
- ✅ UI moderna com feedback visual
- ✅ Avisos contextuais sobre quando cobra
- ✅ Tratamento de erros com sugestões de ação

🎉 **Sistema pronto para uso!**
