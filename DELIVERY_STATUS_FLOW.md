# 📦 Sistema de Status de Entregas (Deliveries)

## 🎯 Endpoint Principal

**PATCH** `/api/deliveries/{id}/status`

Atualiza o status de uma delivery com validações e atualizações automáticas de timestamps.

---

## 🔄 Status Disponíveis

| Status | Descrição | Próximo Status Válido |
|--------|-----------|----------------------|
| `PENDING` | Aguardando aceitação do motoboy | `ACCEPTED`, `CANCELLED` |
| `ACCEPTED` | Aceita pelo motoboy | `PICKED_UP`, `CANCELLED` |
| `PICKED_UP` | Item coletado no ponto de origem | `IN_TRANSIT`, `CANCELLED` |
| `IN_TRANSIT` | Em trânsito para o destino | `COMPLETED`, `CANCELLED` |
| `COMPLETED` | Entregue com sucesso | ❌ Final (não pode mudar) |
| `CANCELLED` | Cancelada | ❌ Pode vir de qualquer status |

---

## ⏱️ Timestamps Automáticos

Cada mudança de status atualiza automaticamente o campo correspondente:

```typescript
interface Delivery {
  // ... outros campos
  
  // Timestamps de status
  acceptedAt?: Date;      // Quando courier aceita (ACCEPTED)
  pickedUpAt?: Date;      // Quando coleta item (PICKED_UP)
  inTransitAt?: Date;     // Quando inicia transporte (IN_TRANSIT)
  completedAt?: Date;     // Quando completa entrega (COMPLETED)
  cancelledAt?: Date;     // Quando cancela (CANCELLED)
  
  // Cancelamento
  cancellationReason?: string;  // Motivo do cancelamento
}
```

---

## 🔐 Validações e Regras

### Fluxo Normal
```
PENDING → ACCEPTED → PICKED_UP → IN_TRANSIT → COMPLETED
```

### Cancelamento
- ✅ Pode ser acionado de **qualquer status** (exceto COMPLETED)
- 🔄 Ao cancelar:
  - Remove o courier (motoboy)
  - Limpa todos os timestamps
  - Volta o status para `PENDING`
  - Atualiza métricas do courier

### Validações
- ❌ Não pode mudar status de uma delivery já `COMPLETED`
- ❌ Não pode pular etapas (ex: PENDING → IN_TRANSIT)
- ✅ Transições devem seguir o fluxo lógico

---

## 📝 Request Body

```json
{
  "status": "IN_TRANSIT",
  "reason": "Opcional - usado principalmente para cancelamento"
}
```

### Exemplos:

#### Aceitar Entrega
```json
PATCH /api/deliveries/123/status
{
  "status": "ACCEPTED"
}
```

#### Marcar como Coletada
```json
PATCH /api/deliveries/123/status
{
  "status": "PICKED_UP"
}
```

#### Iniciar Transporte
```json
PATCH /api/deliveries/123/status
{
  "status": "IN_TRANSIT"
}
```

#### Completar Entrega
```json
PATCH /api/deliveries/123/status
{
  "status": "COMPLETED"
}
```

#### Cancelar Entrega
```json
PATCH /api/deliveries/123/status
{
  "status": "CANCELLED",
  "reason": "Cliente não atendeu após 3 tentativas"
}
```

---

## 🔄 Fluxo no App Mobile

### 1. Motoboy Aceita Entrega
```typescript
// MainApp.tsx - handleRideInviteAccept
await deliveryService.updateDeliveryStatus(deliveryId, 'ACCEPTED');
// Backend: status = ACCEPTED, acceptedAt = now
```

### 2. Motoboy Coleta Item
```typescript
// Tela de detalhes da entrega
await deliveryService.updateDeliveryStatus(deliveryId, 'PICKED_UP');
// Backend: status = PICKED_UP, pickedUpAt = now
```

### 3. Motoboy Inicia Viagem
```typescript
await deliveryService.updateDeliveryStatus(deliveryId, 'IN_TRANSIT');
// Backend: status = IN_TRANSIT, inTransitAt = now
```

### 4. Motoboy Completa Entrega
```typescript
await deliveryService.updateDeliveryStatus(deliveryId, 'COMPLETED');
// Backend: status = COMPLETED, completedAt = now
```

### 5. Cancelamento
```typescript
await deliveryService.updateDeliveryStatus(deliveryId, 'CANCELLED', 'Motivo aqui');
// Backend: 
//   - status = PENDING (volta)
//   - courier = null (remove motoboy)
//   - cancelledAt = now
//   - cancellationReason = "Motivo aqui"
```

---

## 📱 Implementação Sugerida no App

### Service Method
```typescript
// src/services/deliveryService.ts

async updateDeliveryStatus(
  deliveryId: string, 
  status: DeliveryStatus,
  reason?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await apiClient.patch(
      `/deliveries/${deliveryId}/status`,
      { status, reason }
    );
    
    return { success: true, message: 'Status atualizado com sucesso' };
  } catch (error: any) {
    console.error('Erro ao atualizar status:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Erro ao atualizar status' 
    };
  }
}
```

### Type Definition
```typescript
// src/types/delivery.ts

export type DeliveryStatus = 
  | 'PENDING'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Delivery {
  id: string;
  status: DeliveryStatus;
  pickupAddress: string;
  dropoffAddress: string;
  distance: number;
  estimatedPayment: number;
  
  // Timestamps
  createdAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  inTransitAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  
  // Cancelamento
  cancellationReason?: string;
  
  // Local (app)
  locallyRejected?: boolean;
}
```

---

## 🎨 UI Sugerida

### Status Badges
```typescript
const statusConfig = {
  PENDING: { color: '#fbbf24', icon: '⏳', label: 'Aguardando' },
  ACCEPTED: { color: '#3b82f6', icon: '✅', label: 'Aceita' },
  PICKED_UP: { color: '#8b5cf6', icon: '📦', label: 'Coletada' },
  IN_TRANSIT: { color: '#06b6d4', icon: '🚚', label: 'Em Trânsito' },
  COMPLETED: { color: '#10b981', icon: '✔️', label: 'Concluída' },
  CANCELLED: { color: '#ef4444', icon: '❌', label: 'Cancelada' }
};
```

---

## 🔔 Notificações Importantes

- Quando status muda para `ACCEPTED` → Notificar cliente
- Quando status muda para `IN_TRANSIT` → Notificar cliente com tracking
- Quando status muda para `COMPLETED` → Notificar cliente e motoboy
- Quando status muda para `CANCELLED` → Notificar ambos

---

## 📊 Métricas do Courier

O backend atualiza automaticamente as métricas do courier quando:
- ✅ Aceita entrega (`ACCEPTED`)
- ✅ Completa entrega (`COMPLETED`)
- ❌ Cancela entrega (`CANCELLED`)

---

## 🚨 Tratamento de Erros

### Códigos HTTP Esperados
- `200 OK` - Status atualizado com sucesso
- `400 Bad Request` - Transição de status inválida
- `404 Not Found` - Delivery não encontrada
- `409 Conflict` - Status já está neste estado

### Mensagens de Erro Comuns
- "Transição de status inválida"
- "Delivery já foi completada"
- "Delivery não pode ser modificada"

---

## 📅 Data de Atualização
**Última atualização:** 08/11/2025

---

## 🔗 Referências
- Backend: PATCH `/api/deliveries/{id}/status`
- Migration: Adicionado campo `inTransitAt`
- Validações: Fluxo de status implementado
