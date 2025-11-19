# 📦 Estratégia de Cache e Persistência de Entregas

## 🎯 Visão Geral

O aplicativo implementa uma **estratégia híbrida** de gerenciamento de entregas, combinando dados online (backend) com cache local inteligente para otimizar performance e UX.

---

## 📋 Estratégia por Tipo de Entrega

### ⏳ **ENTREGAS PENDENTES** (Status: `PENDING`)

#### Fonte de Dados:
- **SEMPRE ONLINE** - Busca direta do backend a cada requisição
- ❌ **SEM CACHE LOCAL**

#### Razão:
- Outros motoboys podem aceitar a entrega a qualquer momento
- Dados precisam estar sempre atualizados
- Evita mostrar entregas já aceitas por outros

#### Ordenação:
- **Mais recentes primeiro** (`createdAt DESC`)
- Entregas mais novas aparecem no topo da lista

#### Filtros Aplicados:
- ✅ `status = 'PENDING'`
- ✅ Exclui entregas rejeitadas localmente (`locallyRejected`)
- ✅ Opcional: Filtro de proximidade (lat/long/raio)

#### Endpoints:
```http
GET /api/deliveries?status=PENDING&sort=createdAt,desc&size=50
```

---

### 🚚 **ENTREGAS ATIVAS** (Status: `ACCEPTED`, `PICKED_UP`, `IN_TRANSIT`)

#### Fonte de Dados:
- **CACHE LOCAL** com TTL de **30 minutos**
- Atualização via **pull-to-refresh** ou **force refresh**

#### Razão:
- São entregas do próprio motoboy (filtrado por `courier`)
- Status muda com menos frequência
- Reduz carga no backend
- Melhora performance e UX

#### Cache TTL:
- ⏰ **30 minutos** de validade
- Após expirar, busca novamente do backend
- Usuário pode forçar atualização (pull-to-refresh)

#### Filtros Aplicados:
- ✅ `courier = motoboy_logado` (filtrado no backend)
- ✅ `status IN ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')`

#### Invalidação de Cache:
- ✅ Após **aceitar** uma nova entrega
- ✅ Após **atualizar status** de uma entrega
- ✅ No **pull-to-refresh** manual

#### Endpoints:
```http
GET /api/deliveries?courierFilter=mine&status=ACCEPTED,PICKED_UP,IN_TRANSIT&sort=acceptedAt,desc&size=50
```

---

### ✅ **ENTREGAS COMPLETADAS** (Status: `COMPLETED`)

#### Fonte de Dados:
- **CACHE LOCAL** com TTL de **30 minutos**
- Atualização via **pull-to-refresh**

#### Razão:
- Dados históricos que raramente mudam
- São entregas já finalizadas pelo motoboy
- Cache reduz uso de dados e melhora performance

#### Cache TTL:
- ⏰ **30 minutos** de validade
- Histórico estável, mudanças raras

#### Filtros Aplicados:
- ✅ `courier = motoboy_logado`
- ✅ `status = 'COMPLETED'`
- ✅ Ordenado por `completedAt DESC`

#### Invalidação de Cache:
- ✅ Após **completar** uma entrega
- ✅ No **pull-to-refresh** manual

#### Endpoints:
```http
GET /api/deliveries?courierFilter=mine&status=COMPLETED&sort=completedAt,desc&size=50
```

---

## 🗂️ Estrutura de AsyncStorage

### Keys Utilizadas:

```typescript
// IDs de entregas rejeitadas localmente (Array<string>)
'rejected_deliveries' → ["id1", "id2", "id3"]

// IDs de entregas já vistas (popup não mostra novamente)
'seen_deliveries' → ["id1", "id2", "id3"]

// Cache de entregas ativas (com TTL)
'my_active_deliveries_cache' → {
  timestamp: 1699564800000,
  ttl: 1800000, // 30min
  data: [{ id, status, ... }]
}

// Cache de entregas completadas (com TTL)
'my_completed_deliveries_cache' → {
  timestamp: 1699564800000,
  ttl: 1800000, // 30min
  data: [{ id, status, ... }]
}
```

---

## 🔄 Fluxo de Dados

### 1️⃣ **Usuário Abre Aba "Pendentes"**
```
┌──────────────┐
│ AvailableRides│
│   Screen     │
└──────┬───────┘
       │
       ├─► getPendingDeliveries()
       │   └─► 🌐 Backend (sempre online)
       │       └─► /deliveries?status=PENDING
       │
       └─► Filtra rejeitadas localmente
           └─► Exibe na UI
```

### 2️⃣ **Usuário Abre Aba "Ativas"**
```
┌──────────────┐
│ AvailableRides│
│   Screen     │
└──────┬───────┘
       │
       ├─► getMyActiveDeliveries(forceRefresh=false)
       │   │
       │   ├─► Verifica cache (TTL < 30min)?
       │   │   ├─► ✅ SIM → Retorna do cache
       │   │   └─► ❌ NÃO → Busca backend
       │   │                └─► Salva no cache
       │   │
       │   └─► Exibe na UI
```

### 3️⃣ **Usuário Aceita Entrega**
```
┌──────────────┐
│   Accept     │
│   Delivery   │
└──────┬───────┘
       │
       ├─► PATCH /deliveries/{id}/status (ACCEPTED)
       │
       ├─► invalidateActiveCache() ← 🗑️ Limpa cache
       │
       └─► Navega para ActiveDeliveryScreen
```

### 4️⃣ **Pull-to-Refresh**
```
┌──────────────┐
│   Pull ↓     │
└──────┬───────┘
       │
       ├─► Pendentes: Busca online (sempre)
       ├─► Ativas: forceRefresh=true (ignora cache)
       └─► Completadas: forceRefresh=true (ignora cache)
```

---

## 🎯 Métodos Principais

### `deliveryPollingService.ts`

```typescript
// PENDING (sempre online, ordenado por mais recente)
async getPendingDeliveries(lat?, long?, radius?): Promise<PendingDelivery[]>

// ATIVAS (cache 30min)
async getMyActiveDeliveries(forceRefresh = false): Promise<PendingDelivery[]>

// COMPLETADAS (cache 30min)
async getMyCompletedDeliveries(forceRefresh = false): Promise<PendingDelivery[]>

// Invalidação de cache
async invalidateActiveCache(): Promise<void>
async invalidateCompletedCache(): Promise<void>

// Controle de rejeições (apenas IDs)
async markAsRejected(deliveryId: string): Promise<void>
async unmarkAsRejected(deliveryId: string): Promise<void>
async getRejectedDeliveryIds(): Promise<string[]>
```

### `deliveryService.ts`

```typescript
// Busca ativas do motoboy (filtrado por courier)
async getMyActiveDeliveries(): Promise<DeliveryResponse>

// Busca completadas do motoboy (filtrado por courier)
async getMyCompletedDeliveries(): Promise<DeliveryResponse>
```

---

## 🛡️ Vantagens da Estratégia

### ✅ Performance
- Reduz requisições ao backend
- Cache melhora velocidade de carregamento
- Menos consumo de dados móveis

### ✅ UX (Experiência do Usuário)
- Pendentes sempre atualizadas (evita conflitos)
- Ativas/Completadas carregam instantaneamente
- Pull-to-refresh para atualização manual

### ✅ Consistência
- Pendentes não mostram entregas já aceitas
- Cache invalidado após mudanças de status
- Filtros garantem dados corretos por motoboy

### ✅ Offline-First (Parcial)
- Rejeições funcionam offline
- Cache permite visualizar ativas/completadas sem conexão
- Degradação graceful quando backend indisponível

---

## 📊 Comparação: Antes vs Depois

| Aspecto | ❌ Antes | ✅ Depois |
|---------|----------|-----------|
| **PENDING** | Cache local | ✅ Sempre online |
| **Ativas** | Sempre online | ✅ Cache 30min |
| **Completadas** | Sempre online | ✅ Cache 30min |
| **Ordenação PENDING** | Aleatória | ✅ Mais recentes primeiro |
| **Filtro Courier** | ❌ Não aplicado | ✅ Backend filtra |
| **Invalidação** | ❌ Manual | ✅ Automática após ações |
| **Requisições** | Alta (3 tabs = 3 calls) | ✅ Reduzida (cache) |

---

## 🚀 Exemplo de Uso

```typescript
import { deliveryPollingService } from './services/deliveryPollingService';

// Aba Pendentes (sempre online)
const pending = await deliveryPollingService.getPendingDeliveries(lat, long, 5000);

// Aba Ativas (usa cache se válido)
const active = await deliveryPollingService.getMyActiveDeliveries();

// Pull-to-refresh Ativas (força backend)
const activeRefreshed = await deliveryPollingService.getMyActiveDeliveries(true);

// Aceitar entrega (invalida cache)
await deliveryService.updateDeliveryStatus(deliveryId, 'ACCEPTED');
await deliveryPollingService.invalidateActiveCache(); // ← Importante!

// Completar entrega (invalida ambos caches)
await deliveryService.updateDeliveryStatus(deliveryId, 'COMPLETED');
await deliveryPollingService.invalidateActiveCache();
await deliveryPollingService.invalidateCompletedCache();
```

---

## 📝 Notas de Implementação

### Endpoints Backend Esperados:

```http
# Todas as entregas PENDING (sem filtro de courier)
GET /api/deliveries?status=PENDING&sort=createdAt,desc

# Entregas ativas do motoboy logado
GET /api/deliveries?courierFilter=mine&status=ACCEPTED,PICKED_UP,IN_TRANSIT

# Entregas completadas do motoboy logado
GET /api/deliveries?courierFilter=mine&status=COMPLETED

# Atualizar status
PATCH /api/deliveries/{id}/status
```

### Campos Esperados no Response:

```json
{
  "id": "string",
  "status": "PENDING|ACCEPTED|PICKED_UP|IN_TRANSIT|COMPLETED",
  "fromAddress": "string",
  "toAddress": "string",
  "totalAmount": number,
  "distance": number,
  "createdAt": "ISO8601",
  "acceptedAt": "ISO8601",
  "pickedUpAt": "ISO8601",
  "inTransitAt": "ISO8601",
  "completedAt": "ISO8601",
  "courier": {
    "id": "string",
    "name": "string"
  }
}
```

---

**Última Atualização:** 2025-11-09  
**Versão:** 2.0 (Estratégia Híbrida)
