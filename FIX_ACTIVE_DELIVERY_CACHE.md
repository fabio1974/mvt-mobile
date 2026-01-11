# Fix: Salvar entrega ativa ao receber notificação

## Problema
Ao receber notificação, a entrega não está em nenhum storage (removemos o `all_deliveries`). 
Quando tenta abrir, falha com "Entrega não encontrada no storage local".

## Solução

### 1. Adicionar método em `deliveryPollingService.ts` (após linha 346)

```typescript
  /**
   * Salva uma entrega ativa no cache (usada quando recebe notificação)
   */
  async saveActiveDelivery(delivery: any): Promise<void> {
    try {
      if (!delivery || !delivery.id) {
        console.warn('⚠️ Tentativa de salvar entrega inválida');
        return;
      }
      const cachedData = await AsyncStorage.getItem(this.STORAGE_KEY_ACTIVE_CACHE);
      const cached = cachedData ? JSON.parse(cachedData) : { deliveries: [], timestamp: 0 };
      const index = cached.deliveries.findIndex((d: any) => d.id === delivery.id);
      if (index >= 0) {
        cached.deliveries[index] = delivery;
      } else {
        cached.deliveries.push(delivery);
      }
      cached.timestamp = Date.now();
      await AsyncStorage.setItem(this.STORAGE_KEY_ACTIVE_CACHE, JSON.stringify(cached));
      console.log(`✅ Entrega ${delivery.id} salva no cache de ativas`);
    } catch (error) {
      console.error('❌ Erro ao salvar entrega ativa:', error);
    }
  }
```

### 2. Chamar em `notificationService.ts` (em `handleForegroundNotification`)

Adicionar após chamar o callback:
```typescript
// Salva entrega no cache de ativas para uso posterior
const { deliveryPollingService } = await import('./deliveryPollingService');
await deliveryPollingService.saveActiveDelivery({
  id: data.deliveryId,
  ...data.data // Dados adicionais da notificação
});
```

### 3. Modificar `ActiveDeliveryScreen.tsx` (no `loadDelivery`)

Primeiro busca do cache de ativas, depois backend:
```typescript
// Tenta buscar do cache de ativas primeiro
const { deliveryPollingService } = require('../../services/deliveryPollingService');
const activeCache = await AsyncStorage.getItem('my_active_deliveries_cache');
if (activeCache) {
  const cached = JSON.parse(activeCache);
  const found = cached.deliveries?.find((d: any) => d.id === deliveryId);
  if (found) {
    console.log(`✅ Entrega ${deliveryId} encontrada no cache de ativas`);
    setDelivery(found);
    return;
  }
}
```
