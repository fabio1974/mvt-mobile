# Endpoints de Cartão de Crédito - Backend

## 📋 Resumo

Este documento descreve os endpoints REST que precisam ser criados no backend para suportar o sistema de meios de pagamento com cartões de crédito.

---

## 🔐 Autenticação

Todos os endpoints requerem autenticação via JWT. O `userId` é extraído do token do usuário logado.

---

## 📍 Endpoints

### 1. **GET /payment/cards**
Busca todos os cartões de crédito do usuário logado.

**Response 200:**
```json
[
  {
    "id": "uuid-do-cartao",
    "cardNumber": "1234",  // Últimos 4 dígitos
    "cardHolderName": "JOAO SILVA",
    "expiryMonth": "12",
    "expiryYear": "25",
    "brand": "VISA",  // VISA | MASTERCARD | ELO | AMEX | HIPERCARD | OTHER
    "isDefault": true,
    "token": "token-gateway-pagamento"  // Opcional
  }
]
```

**Response 404:** Quando não há cartões cadastrados
```json
{
  "message": "Nenhum cartão cadastrado"
}
```

---

### 2. **POST /payment/cards**
Adiciona um novo cartão de crédito.

**Request Body:**
```json
{
  "cardNumber": "4111111111111111",  // Número completo do cartão
  "cardHolderName": "JOAO SILVA",
  "expiryMonth": "12",
  "expiryYear": "25",
  "cvv": "123"
}
```

**Validações:**
- `cardNumber`: Obrigatório, deve passar validação de Luhn
- `cardHolderName`: Obrigatório
- `expiryMonth`: Obrigatório, entre 01 e 12
- `expiryYear`: Obrigatório, não pode estar vencido
- `cvv`: Obrigatório, 3 ou 4 dígitos

**Importante:**
- Armazenar apenas os últimos 4 dígitos do cartão (`cardNumber`)
- Identificar a bandeira automaticamente pelo número
- Criptografar dados sensíveis
- Integrar com gateway de pagamento (ex: Stripe, Pagar.me) para tokenizar o cartão
- Se for o primeiro cartão, definir como padrão automaticamente

**Response 201:**
```json
{
  "id": "uuid-do-cartao",
  "cardNumber": "1111",
  "cardHolderName": "JOAO SILVA",
  "expiryMonth": "12",
  "expiryYear": "25",
  "brand": "VISA",
  "isDefault": true,
  "token": "tok_xxxxxxxx"
}
```

**Response 400:** Validação falhou
```json
{
  "message": "Número do cartão inválido"
}
```

---

### 3. **DELETE /payment/cards/{cardId}**
Remove um cartão de crédito.

**Path Parameter:**
- `cardId`: UUID do cartão

**Response 204:** Cartão removido com sucesso (sem body)

**Response 404:** Cartão não encontrado
```json
{
  "message": "Cartão não encontrado"
}
```

**Response 400:** Não pode remover o último cartão se houver preferência de pagamento ativa
```json
{
  "message": "Não é possível remover o último cartão com preferência ativa"
}
```

---

### 4. **PATCH /payment/cards/{cardId}/set-default**
Define um cartão como padrão.

**Path Parameter:**
- `cardId`: UUID do cartão

**Comportamento:**
- Remove flag `isDefault` de todos os outros cartões do usuário
- Define o cartão especificado como `isDefault = true`

**Response 200:**
```json
{
  "message": "Cartão padrão atualizado com sucesso"
}
```

**Response 404:** Cartão não encontrado
```json
{
  "message": "Cartão não encontrado"
}
```

---

### 5. **GET /payment/preference**
Busca a preferência de pagamento do usuário logado.

**Response 200:**
```json
{
  "preferredMethod": "CREDIT_CARD",  // PIX | CREDIT_CARD | CASH
  "selectedCardId": "uuid-do-cartao"  // Opcional, apenas se preferredMethod for CREDIT_CARD
}
```

**Response 404:** Quando não há preferência cadastrada
```json
{
  "message": "Preferência de pagamento não encontrada"
}
```

---

### 6. **PUT /payment/preference**
Atualiza a preferência de pagamento do usuário.

**Request Body:**
```json
{
  "preferredMethod": "CREDIT_CARD",  // PIX | CREDIT_CARD | CASH
  "selectedCardId": "uuid-do-cartao"  // Obrigatório se preferredMethod for CREDIT_CARD
}
```

**Validações:**
- Se `preferredMethod` for `CREDIT_CARD`, `selectedCardId` é obrigatório
- Verificar se o cartão pertence ao usuário logado
- Se `preferredMethod` for `PIX` ou `CASH`, `selectedCardId` deve ser `null`

**Response 200:**
```json
{
  "message": "Preferência de pagamento atualizada com sucesso",
  "preference": {
    "preferredMethod": "CREDIT_CARD",
    "selectedCardId": "uuid-do-cartao"
  }
}
```

**Response 400:** Validação falhou
```json
{
  "message": "Cartão não encontrado ou não pertence ao usuário"
}
```

---

## 🗄️ Modelo de Dados Sugerido

### Tabela: `credit_cards`
```sql
CREATE TABLE credit_cards (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  card_number VARCHAR(4) NOT NULL,  -- Últimos 4 dígitos
  card_holder_name VARCHAR(255) NOT NULL,
  expiry_month VARCHAR(2) NOT NULL,
  expiry_year VARCHAR(2) NOT NULL,
  brand VARCHAR(20) NOT NULL,  -- VISA, MASTERCARD, etc
  is_default BOOLEAN DEFAULT FALSE,
  token VARCHAR(255),  -- Token do gateway
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_credit_cards_user ON credit_cards(user_id);
CREATE INDEX idx_credit_cards_default ON credit_cards(user_id, is_default);
```

### Tabela: `payment_preferences`
```sql
CREATE TABLE payment_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  preferred_method VARCHAR(20) NOT NULL,  -- PIX, CREDIT_CARD, CASH
  selected_card_id UUID REFERENCES credit_cards(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_pref_user ON payment_preferences(user_id);
```

---

## 🔒 Segurança

### Boas Práticas:

1. **Nunca armazenar:**
   - Número completo do cartão
   - CVV

2. **Sempre criptografar:**
   - Nome do titular (se necessário)
   - Token do gateway

3. **PCI DSS Compliance:**
   - Use gateway de pagamento (Stripe, Pagar.me, etc)
   - Eles lidam com a tokenização segura
   - Armazene apenas tokens e últimos 4 dígitos

4. **Validações:**
   - Algoritmo de Luhn para número do cartão
   - Data de validade não pode estar vencida
   - CVV apenas para criar, nunca armazenar

---

## 🧪 Casos de Teste

1. **Adicionar primeiro cartão** → Deve ser automaticamente definido como padrão
2. **Adicionar segundo cartão** → Primeiro continua como padrão
3. **Remover cartão padrão** → Se houver outros, promover um como padrão
4. **Definir preferência CREDIT_CARD sem cartões** → Deve falhar
5. **Remover último cartão com preferência ativa** → Deve limpar preferência ou falhar

---

## 📱 Integração com Frontend

O frontend já está completo e pronto para consumir estes endpoints. As telas incluem:

1. **PaymentMethodsScreen**: Escolhe entre PIX, Cartão ou Dinheiro
2. **ManageCreditCardsScreen**: Lista e gerencia cartões
3. **AddCreditCardScreen**: Adiciona novo cartão com validações

O serviço `paymentService.ts` já implementa todas as chamadas aos endpoints descritos.

---

## 🔄 Fluxo de Uso

1. Cliente acessa "Meios de Pagamento" no dashboard
2. Escolhe "Cartão de Crédito"
3. Sistema redireciona para "Meus Cartões"
4. Cliente adiciona novo cartão (dados são enviados ao gateway)
5. Backend recebe token do gateway e armazena
6. Cliente seleciona cartão como padrão
7. Preferência de pagamento é atualizada
8. Nas próximas entregas, pagamento é automático usando o cartão padrão

---

## ❓ Dúvidas Técnicas

- **Gateway recomendado:** Pagar.me ou Stripe (ambos têm boa documentação)
- **Webhook:** Considere implementar webhooks para notificações de pagamento
- **Logs:** Registre todas as operações de pagamento para auditoria
- **Rate Limiting:** Implemente para evitar abuso

---

**Pronto para implementação!** 🚀
