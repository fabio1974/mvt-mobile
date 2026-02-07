# 🔧 BACKEND - REQUISITOS PARA INTEGRAÇÃO COM MOBILE

## 📋 O que o Backend precisa implementar

O mobile está 100% pronto. Este documento lista **TUDO** que o backend precisa fazer para o sistema funcionar.

---

## 1️⃣ Endpoints de Preferência de Pagamento

### GET `/api/customers/me/payment-preference`

**Descrição:** Retorna a preferência de pagamento automático do cliente logado.

**Response 200:**
```json
{
  "preferredPaymentMethod": "CREDIT_CARD",
  "defaultCardId": 123,
  "defaultCard": {
    "id": 123,
    "lastFourDigits": "4242",
    "brand": "VISA",
    "holderName": "JOÃO DA SILVA",
    "expiration": "12/25",
    "isDefault": true,
    "isActive": true,
    "isExpired": false,
    "maskedNumber": "Visa **** 4242",
    "createdAt": "2026-01-15T10:00:00Z",
    "lastUsedAt": "2026-02-01T14:30:00Z"
  }
}
```

**Response 404 (não tem preferência ainda):**
```json
{
  "error": "Preference not found"
}
```

**Comportamento Mobile:** Se 404, usa default `CREDIT_CARD` sem cartão selecionado.

---

### PUT `/api/customers/me/payment-preference`

**Descrição:** Salva/atualiza a preferência de pagamento automático.

**Request Body:**
```json
{
  "preferredPaymentMethod": "PIX",
  "defaultCardId": null
}
```

ou

```json
{
  "preferredPaymentMethod": "CREDIT_CARD",
  "defaultCardId": 123
}
```

**Response 200:**
```json
{
  "preferredPaymentMethod": "CREDIT_CARD",
  "defaultCardId": 123,
  "defaultCard": {
    "id": 123,
    "lastFourDigits": "4242",
    "brand": "VISA",
    "holderName": "JOÃO DA SILVA",
    "expiration": "12/25",
    "isDefault": true,
    "isActive": true,
    "isExpired": false,
    "maskedNumber": "Visa **** 4242",
    "createdAt": "2026-01-15T10:00:00Z",
    "lastUsedAt": null
  }
}
```

**Validações:**
- Se `preferredPaymentMethod = CREDIT_CARD`, `defaultCardId` é obrigatório
- Se `preferredPaymentMethod = PIX`, `defaultCardId` deve ser null

---

## 2️⃣ Endpoint de Criar Entrega (Atualizado)

### POST `/api/deliveries`

**Novo campo obrigatório:** `deliveryType`

**Request Body:**
```json
{
  "status": "PENDING",
  "client": 456,
  "itemDescription": "Documento urgente",
  "recipientName": "Maria Santos",
  "recipientPhone": "(11) 98765-4321",
  "fromAddress": "Rua A, 100 - Centro, São Paulo - SP",
  "fromLatitude": -23.550520,
  "fromLongitude": -46.633308,
  "toAddress": "Rua B, 200 - Jardins, São Paulo - SP",
  "toLatitude": -23.561414,
  "toLongitude": -46.656451,
  "totalAmount": "25.00",
  "distanceKm": 5.2,
  "deliveryType": "DELIVERY"
}
```

**Valores válidos para `deliveryType`:**
- `"DELIVERY"` = Entrega (cobra quando motoboy ACEITA)
- `"RIDE"` = Viagem (cobra quando motorista INICIA - pickup)

**Response 200:**
```json
{
  "id": "789",
  "status": "PENDING",
  "deliveryType": "DELIVERY",
  "client": {...},
  "totalAmount": "25.00",
  ...
}
```

---

## 3️⃣ Lógica de Cobrança Automática

### Quando Motoboy ACEITA entrega (se deliveryType = DELIVERY)

**Fluxo:**
1. Motoboy clica "Aceitar"
2. Backend muda status para `ACCEPTED`
3. **IMEDIATAMENTE após aceitar:**
   - Busca preferência do cliente: `GET /customers/{clientId}/payment-preference`
   - Se `preferredPaymentMethod = CREDIT_CARD`:
     - Cobra no cartão (`defaultCardId`) via Pagar.me
     - Se sucesso: envia push **PAYMENT_SUCCESS**
     - Se falha: envia push **PAYMENT_FAILED**
   - Se `preferredPaymentMethod = PIX`:
     - Gera QR Code PIX (expira em 5 minutos)
     - Envia push **PIX_REQUIRED** com `pixInfo`
4. Salva transação no banco

---

### Quando Motorista INICIA viagem (se deliveryType = RIDE)

**Fluxo:**
1. Motorista clica "Coletar e Iniciar Viagem" (botão único)
2. Backend muda status para `IN_TRANSIT`
3. **IMEDIATAMENTE após iniciar:**
   - Busca preferência do cliente
   - **OBRIGATÓRIO:** Cobra no cartão (RIDE não aceita PIX)
   - Se sucesso: envia push **PAYMENT_SUCCESS**
   - Se falha: envia push **PAYMENT_FAILED**
4. Salva transação

**Importante:** Backend deve **RECUSAR** criar RIDE se cliente não tem cartão configurado (validação extra).

---

## 4️⃣ Geração de QR Code PIX

### Biblioteca recomendada (Java/Spring):
```xml
<dependency>
    <groupId>br.com.efi</groupId>
    <artifactId>gn-api-sdk-java</artifactId>
    <version>1.0.7</version>
</dependency>
```

**Ou integração com Pagar.me PIX:**
```bash
POST https://api.pagar.me/core/v5/charges
```

### Dados do PIX a serem gerados:
```json
{
  "deliveryId": "789",
  "qrCode": "00020126360014br.gov.bcb.pix0114+5511987654321...", // String completa
  "qrCodeBase64": "data:image/png;base64,iVBORw0KGgo...", // Opcional (mobile gera do qrCode)
  "pixKey": "chavepix@dominio.com",
  "amount": 2500, // em centavos (R$ 25,00)
  "expiresAt": "2026-02-02T12:30:00Z", // +5 minutos do now
  "pixId": "pix-12345-abcde"
}
```

**Importante:** 
- Timer de 5 minutos (300 segundos)
- Webhook para confirmar pagamento
- Cancelar entrega se não pagar em 5 minutos

---

## 5️⃣ Push Notifications

### Biblioteca: Firebase Cloud Messaging (FCM)

**Token já está sendo enviado pelo mobile em:**
```
POST /api/users/push-token
{
  "pushToken": "ExponentPushToken[xxxxxx]",
  "platform": "android"
}
```

### 5.1 Notificação: PIX_REQUIRED

**Quando:** Cliente tem preferência PIX e motoboy aceitou DELIVERY.

**Payload:**
```json
{
  "to": "ExponentPushToken[xxxxxx]",
  "sound": "default",
  "title": "💰 Pagamento PIX Necessário",
  "body": "Seu motoboy aceitou! Pague o PIX em até 5 minutos.",
  "data": {
    "type": "PIX_REQUIRED",
    "deliveryId": "789",
    "message": "Pague o PIX para confirmar sua entrega",
    "amount": 2500,
    "pixInfo": {
      "deliveryId": "789",
      "qrCode": "00020126360014br.gov.bcb.pix...",
      "qrCodeBase64": "",
      "pixKey": "chavepix@dominio.com",
      "amount": 2500,
      "expiresAt": "2026-02-02T12:30:00Z",
      "pixId": "pix-12345"
    }
  }
}
```

---

### 5.2 Notificação: PAYMENT_SUCCESS

**Quando:** Cobrança no cartão aprovada.

**Payload:**
```json
{
  "to": "ExponentPushToken[xxxxxx]",
  "sound": "default",
  "title": "✅ Pagamento Aprovado!",
  "body": "Seu pagamento de R$ 25,00 foi processado com sucesso.",
  "data": {
    "type": "PAYMENT_SUCCESS",
    "deliveryId": "789",
    "message": "Pagamento confirmado! Seu motoboy está a caminho.",
    "amount": 2500
  }
}
```

---

### 5.3 Notificação: PAYMENT_FAILED

**Quando:** Cobrança no cartão recusada.

**Payload:**
```json
{
  "to": "ExponentPushToken[xxxxxx]",
  "sound": "default",
  "title": "❌ Pagamento Recusado",
  "body": "Não foi possível processar o pagamento. Atualize seus dados.",
  "data": {
    "type": "PAYMENT_FAILED",
    "deliveryId": "789",
    "message": "Cartão recusado. Configure outro método de pagamento.",
    "errorCode": "insufficient_funds",
    "errorMessage": "Saldo insuficiente"
  }
}
```

---

### 5.4 Notificação: PIX_CONFIRMED

**Quando:** Webhook do banco/Pagar.me confirma pagamento PIX.

**Payload:**
```json
{
  "to": "ExponentPushToken[xxxxxx]",
  "sound": "default",
  "title": "✅ PIX Confirmado!",
  "body": "Seu pagamento PIX foi confirmado. Entrega em andamento!",
  "data": {
    "type": "PIX_CONFIRMED",
    "deliveryId": "789",
    "message": "PIX confirmado com sucesso!"
  }
}
```

---

## 6️⃣ Split de Pagamento (Pagar.me)

### Configuração do Split:
- **87%** para o motoboy/motorista
- **13%** para a plataforma
- **Sem taxa para organizador** (cliente CUSTOMER não tem organizador)

**Exemplo de Request Pagar.me:**
```json
{
  "amount": 2500,
  "payment_method": "credit_card",
  "card_id": "card_abc123",
  "split_rules": [
    {
      "recipient_id": "re_courier_xyz",
      "percentage": 87,
      "liable": true,
      "charge_processing_fee": true
    },
    {
      "recipient_id": "re_platform_main",
      "percentage": 13,
      "liable": false,
      "charge_processing_fee": false
    }
  ]
}
```

---

## 7️⃣ Banco de Dados - Novas Tabelas/Campos

### Tabela: `customer_payment_preferences`
```sql
CREATE TABLE customer_payment_preferences (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL UNIQUE,
    preferred_payment_method VARCHAR(20) NOT NULL, -- 'PIX' ou 'CREDIT_CARD'
    default_card_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (default_card_id) REFERENCES customer_cards(id)
);
```

### Tabela `deliveries` - Adicionar campo:
```sql
ALTER TABLE deliveries ADD COLUMN delivery_type VARCHAR(20) NOT NULL DEFAULT 'DELIVERY';
-- Valores: 'DELIVERY' ou 'RIDE'
```

### Tabela `pix_payments` (nova):
```sql
CREATE TABLE pix_payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    delivery_id BIGINT NOT NULL,
    pix_id VARCHAR(100) NOT NULL UNIQUE,
    qr_code TEXT NOT NULL,
    pix_key VARCHAR(100) NOT NULL,
    amount INT NOT NULL, -- em centavos
    status VARCHAR(20) NOT NULL, -- 'PENDING', 'PAID', 'EXPIRED', 'CANCELLED'
    expires_at TIMESTAMP NOT NULL,
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id)
);
```

---

## 8️⃣ Webhooks Necessários

### Webhook Pagar.me - Confirmação de PIX
```
POST https://seu-backend.com/api/webhooks/pagarme/pix
```

**Payload esperado:**
```json
{
  "id": "pix_12345",
  "status": "paid",
  "charges": [{
    "amount": 2500,
    "paid_at": "2026-02-02T12:25:00Z"
  }]
}
```

**Ação do Backend:**
1. Atualizar `pix_payments.status = PAID`
2. Atualizar `pix_payments.paid_at`
3. Buscar pushToken do cliente
4. Enviar push **PIX_CONFIRMED**

---

## 9️⃣ Fluxograma de Implementação

```
1. Cliente configura preferência no app
   ↓
2. Mobile salva via PUT /customers/me/payment-preference
   ↓
3. Cliente cria entrega com deliveryType
   ↓
4. Mobile envia POST /deliveries com { deliveryType: 'DELIVERY' ou 'RIDE' }
   ↓
5a. Se DELIVERY: Backend aguarda motoboy aceitar
    ↓
    Motoboy aceita → Backend cobra/gera PIX
    ↓
    Envia push (SUCCESS/FAILED/PIX_REQUIRED)
    
5b. Se RIDE: Backend aguarda motorista aceitar + iniciar
    ↓
    Motorista inicia → Backend cobra cartão
    ↓
    Envia push (SUCCESS/FAILED)
    
6. Se PIX: aguarda webhook de confirmação
   ↓
   Webhook chega → Envia push PIX_CONFIRMED
```

---

## 🔟 Prioridades de Implementação

### Fase 1 (MVP):
1. ✅ Criar tabela `customer_payment_preferences`
2. ✅ Implementar GET/PUT `/customers/me/payment-preference`
3. ✅ Adicionar campo `deliveryType` na tabela `deliveries`
4. ✅ Atualizar POST `/deliveries` para aceitar `deliveryType`

### Fase 2 (Cobrança Cartão):
5. ✅ Lógica de cobrança no aceite (DELIVERY)
6. ✅ Lógica de cobrança no pickup (RIDE)
7. ✅ Integração Pagar.me com split 87/13
8. ✅ Envio de push PAYMENT_SUCCESS
9. ✅ Envio de push PAYMENT_FAILED

### Fase 3 (PIX):
10. ✅ Integração Pagar.me PIX (geração QR Code)
11. ✅ Criar tabela `pix_payments`
12. ✅ Envio de push PIX_REQUIRED
13. ✅ Webhook confirmação PIX
14. ✅ Envio de push PIX_CONFIRMED
15. ✅ Timer de expiração (5 minutos)

---

## 📞 Endpoints de Push do Expo

**URL Base:** `https://exp.host/--/api/v2/push/send`

**Headers:**
```
Content-Type: application/json
Accept: application/json
```

**Body:**
```json
{
  "to": "ExponentPushToken[xxxxxx]",
  "sound": "default",
  "title": "Título",
  "body": "Mensagem",
  "data": {
    "type": "PAYMENT_SUCCESS",
    "deliveryId": "789",
    ...
  }
}
```

---

## ✅ Checklist Backend

- [ ] Criar tabela `customer_payment_preferences`
- [ ] Implementar GET `/customers/me/payment-preference`
- [ ] Implementar PUT `/customers/me/payment-preference`
- [ ] Adicionar campo `deliveryType` em `deliveries`
- [ ] Atualizar POST `/deliveries` para receber `deliveryType`
- [ ] Lógica: cobrar no aceite (DELIVERY)
- [ ] Lógica: cobrar no pickup (RIDE)
- [ ] Integração Pagar.me - cobrança cartão
- [ ] Integração Pagar.me - geração PIX
- [ ] Split 87/13 configurado
- [ ] Criar tabela `pix_payments`
- [ ] Enviar push PAYMENT_SUCCESS
- [ ] Enviar push PAYMENT_FAILED
- [ ] Enviar push PIX_REQUIRED (com pixInfo)
- [ ] Webhook confirmação PIX
- [ ] Enviar push PIX_CONFIRMED
- [ ] Timer expiração PIX (5 minutos)
- [ ] Testes integrados E2E

---

## 🎉 Conclusão

Com estes requisitos implementados, o sistema de pagamento automático estará **100% funcional** entre mobile e backend!

O mobile já está pronto e aguardando apenas a implementação destes endpoints e lógicas no backend.

🚀 **Bora codar!**
