# Sistema de Localização - Arquitetura

## 🎯 Objetivo
Sistema transparente que usa **mock em Expo Go** e **GPS real em builds** automaticamente, sem necessidade de configuração manual.

## 🏗️ Fluxo Automático

```
Login/Inicialização
    ↓
UnifiedLocationService.initialize()
    ↓
LocationService.initialize()
    ↓
┌─────────────────────────────────┐
│ Detecta se está em Expo Go?     │
│ (Constants.appOwnership === 'expo') │
└─────────────────────────────────┘
         │
         ├─── SIM (Expo Go) ─────→ Ativa Mock Automático (Ubajara-CE)
         │                          └─→ useMockLocation = true
         │
         └─── NÃO (Build Real) ───→ Usa GPS Real
                                    └─→ useMockLocation = false
```

## 📍 getCurrentLocation() - Lógica Transparente

O método `getCurrentLocation()` decide automaticamente de onde pegar a localização:

```typescript
async getCurrentLocation(): Promise<LocationData | null> {
  // 1. Se mock está ativo (Expo Go), retorna coordenadas simuladas
  if (this.useMockLocation && this.mockLocationData) {
    return this.simulateMovement(this.mockLocationData);
  }

  // 2. Se não é mock, tenta usar GPS real
  try {
    const location = await Location.getCurrentPositionAsync();
    return location;
  } catch (error) {
    // 3. Fallback para Ubajara em DEV se GPS falhar
    if (__DEV__) {
      return UBAJARA_CENTER;
    }
    return null;
  }
}
```

## 🔄 Tracking Automático (a cada 30 segundos)

```
startForegroundTracking() executa a cada 30s:
    ↓
getCurrentLocation()
    ↓
┌──────────────────────────────┐
│ Expo Go?                     │
│ → Retorna Mock (Ubajara)     │
│                              │
│ Build Real?                  │
│ → Retorna GPS Real           │
└──────────────────────────────┘
    ↓
updateUserLocation(location)
    ↓
Backend recebe coordenadas
(não sabe se é mock ou real)
```

## 🎭 Mock em Expo Go

**Características do Mock:**
- ✅ Ativado automaticamente ao detectar Expo Go
- ✅ Coordenadas base: Ubajara-CE (-3.8566, -40.9219)
- ✅ Simulação de movimento opcional (0-50m)
- ✅ 70% de chance de ficar parado (motoboy em entrega)
- ✅ 30% de chance de se mover (deslocamento na cidade)

**Controle Manual (Menu de Teste):**
- 🏍️ Botão "Simular Movimento" - ativa deslocamento
- 🛑 Botão "Pausar Movimento" - motoboy fica parado
- Apenas visível quando mock está ativo

## 📱 GPS Real (Build Standalone)

Quando **NÃO** estiver no Expo Go:
- ✅ Usa `expo-location` normalmente
- ✅ Requer permissões de foreground/background
- ✅ Coordenadas reais do dispositivo
- ✅ Tracking em background funciona

## 🔍 Detecção de Ambiente

```typescript
const isRunningInExpoGo = (): boolean => {
  return Constants.appOwnership === 'expo';
};
```

| Ambiente | `appOwnership` | Comportamento |
|----------|---------------|---------------|
| Expo Go | `'expo'` | Mock automático (Ubajara) |
| Build Standalone | `'standalone'` | GPS real |
| Build Bare | `null` | GPS real |

## 📊 Logs do Sistema

### Expo Go (Mock)
```
🎭 Detectado Expo Go - ativando mock de localização automaticamente
🎭 Mock de localização ativado (Ubajara-CE): {lat: -3.8566, lng: -40.9219}
📍 Movimento DESATIVADO
🔄 [Foreground] Obtendo localização...
📍 [Foreground] Localização obtida: {lat: -3.856600, lng: -40.921900, mock: true}
📍 Atualizando localização: -3.8566, -40.9219
✅ Localização atualizada no backend
```

### Build Real (GPS)
```
📱 Detectado app standalone - usando localização real
🔄 [Foreground] Obtendo localização...
📍 [Foreground] Localização obtida: {lat: -3.691234, lng: -40.348765, mock: false}
📍 Atualizando localização: -3.691234, -40.348765
✅ Localização atualizada no backend
```

## 🚀 Vantagens da Arquitetura

1. **Transparência Total**: Backend não sabe se é mock ou real
2. **Zero Configuração**: Detecção automática do ambiente
3. **Desenvolvimento Facilitado**: Mock funciona no Expo Go onde GPS falha
4. **Produção Real**: Build usa GPS sem modificações
5. **Consistência**: Mesma interface para mock e real

## 🧪 Testando o Sistema

### No Expo Go (iOS/Android)
1. Faça login normalmente
2. Sistema ativa mock automaticamente
3. Veja logs confirmando mock ativo
4. Use botão "Simular Movimento" no menu de teste
5. Backend recebe coordenadas de Ubajara-CE

### Em Build Real
1. Compile app (EAS Build ou build local)
2. Instale no dispositivo
3. Conceda permissões de localização
4. Sistema usa GPS automaticamente
5. Backend recebe coordenadas reais do dispositivo

## 📝 Arquivos Importantes

- `src/services/locationService.ts` - Lógica principal
- `src/services/unifiedLocationService.ts` - Wrapper multiplataforma
- `src/screens/MainApp.tsx` - Inicialização e UI
- `src/services/userLocationService.ts` - Comunicação com backend
