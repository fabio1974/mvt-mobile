# 📱 Wizard de Criação de Entregas e Viagens

## 📋 Visão Geral

O sistema de criação de entregas e viagens foi redesenhado como um **wizard multi-etapas** (ao invés de um formulário único com scroll), proporcionando uma experiência de usuário mais intuitiva e organizada.

---

## 🎯 Fluxos Implementados

### 🚗 RIDE (Viagem de Passageiro) - 4 Etapas

1. **Etapa 1: Tipo de Serviço**
   - Escolha entre DELIVERY ou RIDE
   - Cards visuais com descrição e features
   - Ícones: 🚗 (carro) para RIDE, 📦 (cubo) para DELIVERY

2. **Etapa 2: Endereço de Origem**
   - Input de endereço (texto livre)
   - Botão "Usar Minha Localização Atual" (GPS)
   - Campos opcionais para latitude/longitude
   - Default: localização atual do usuário

3. **Etapa 3: Endereço de Destino**
   - Input de endereço
   - Campos opcionais para latitude/longitude
   - Cálculo automático de distância (Haversine)
   - Display visual da distância em km

4. **Etapa 4: Confirmação**
   - Resumo visual da rota (origem → destino)
   - Display de distância calculada
   - Input de valor do serviço (R$)
   - Aviso: "Pago quando motorista INICIAR viagem"
   - Validação: Requer cartão cadastrado (não aceita PIX)

---

### 📦 DELIVERY (Entrega de Objeto) - 5 Etapas

1. **Etapa 1: Tipo de Serviço** (igual ao RIDE)

2. **Etapa 2: Endereço de Origem** (igual ao RIDE)
   - Default: localização do CUSTOMER (cliente)

3. **Etapa 3: Endereço de Destino** (igual ao RIDE)

4. **Etapa 4: Detalhes da Entrega** ⭐ NOVO
   - Descrição do item (ex: "Documentos", "Encomenda pequena")
   - Nome completo do destinatário
   - Telefone do destinatário
   - Box de segurança: "Dados compartilhados só com motoboy"

5. **Etapa 5: Confirmação**
   - Resumo visual da rota
   - Display dos detalhes (item, destinatário, telefone)
   - Input de valor do serviço (R$)
   - Aviso: "Pago quando motoboy ACEITAR"
   - Aceita PIX ou Cartão

---

## 🎨 Componentes Criados

### Estrutura de Arquivos

```
src/components/delivery/
├── CreateDeliveryWizard.tsx         (Controlador principal)
└── wizard-steps/
    ├── StepTypeSelector.tsx         (Etapa 1: Tipo)
    ├── StepOriginAddress.tsx        (Etapa 2: Origem)
    ├── StepDestinationAddress.tsx   (Etapa 3: Destino)
    ├── StepDeliveryDetails.tsx      (Etapa 4: Detalhes - só DELIVERY)
    └── StepConfirmation.tsx         (Etapa 4/5: Confirmação)
```

---

## 🔧 Implementação Técnica

### CreateDeliveryWizard.tsx

**Props:**
```typescript
interface CreateDeliveryWizardProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (delivery: any) => void;
  userLocation?: { latitude: number; longitude: number } | null;
}
```

**Interface de Dados:**
```typescript
export interface WizardData {
  deliveryType: DeliveryType;
  fromAddress: string;
  fromLatitude: number | null;
  fromLongitude: number | null;
  toAddress: string;
  toLatitude: number | null;
  toLongitude: number | null;
  itemDescription: string;
  recipientName: string;
  recipientPhone: string;
  distanceKm: number | null;
  totalAmount: string;
}
```

**Funções Principais:**
- `getTotalSteps()`: Retorna 4 (RIDE) ou 5 (DELIVERY)
- `validateCurrentStep()`: Valida campos obrigatórios de cada etapa
- `renderStep()`: Renderiza conteúdo condicional baseado na etapa atual
- `handleSubmit()`: Valida pagamento e cria entrega/viagem

---

### StepTypeSelector.tsx

**Features:**
- Dois cards grandes: DELIVERY e RIDE
- Lista de features com ícones de checkmark
- Badge visual de seleção (borda verde, badge no canto)
- Info box sobre preferências de pagamento

**Design:**
- Background escuro (#0f172a)
- Cards em #1e293b
- Seleção: borda verde (#10b981)
- Icons: Ionicons (cube, car)

---

### StepOriginAddress.tsx

**Features:**
- Botão verde: "Usar Minha Localização Atual"
- TextInput para endereço (multiline, 3 linhas)
- Inputs opcionais para lat/lng
- Estado de loading ao buscar GPS

**Props:**
```typescript
interface StepOriginAddressProps {
  address: string;
  latitude: number | null;
  longitude: number | null;
  userLocation?: { latitude: number; longitude: number } | null;
  onUpdate: (data: {
    fromAddress: string;
    fromLatitude: number | null;
    fromLongitude: number | null;
  }) => void;
}
```

---

### StepDestinationAddress.tsx

**Features:**
- TextInput para endereço
- Inputs opcionais para lat/lng
- **Cálculo automático de distância** usando fórmula de Haversine
- Display visual: box verde mostrando "X.XX km"

**Haversine:**
```typescript
useEffect(() => {
  if (fromLatitude && fromLongitude && localLat && localLng) {
    const R = 6371; // Raio da Terra em km
    const dLat = ((localLat - fromLatitude) * Math.PI) / 180;
    const dLon = ((localLng - fromLongitude) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((fromLatitude * Math.PI) / 180) *
      Math.cos((localLat * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    setCalculatedDistance(distance);
  }
}, [fromLatitude, fromLongitude, localLat, localLng]);
```

---

### StepDeliveryDetails.tsx

**Features:**
- TextArea para descrição do item (multiline)
- Input para nome do destinatário
- Input para telefone (keyboard: phone-pad)
- Info box: "Seus dados estão seguros"

**Validação:**
- Todos os 3 campos obrigatórios
- Não permite avançar sem preencher

---

### StepConfirmation.tsx

**Features:**
- Card de resumo com badge do tipo (DELIVERY/RIDE)
- Rota visual: origem (dot verde) → linha → destino (dot vermelho)
- Display de distância (se disponível)
- Detalhes específicos (só DELIVERY):
  - Ícone + descrição do item
  - Ícone + nome do destinatário
  - Ícone + telefone do destinatário
- Input de valor: R$ 0,00 (keyboard: decimal-pad)
- Warning box diferenciado por tipo:
  - DELIVERY: azul, "Pago quando motoboy aceitar"
  - RIDE: roxo, "Pago quando motorista iniciar"
- Termos de serviço (checkbox visual)

**Design Responsivo:**
```typescript
const isRide = wizardData.deliveryType === 'RIDE';

<View style={[styles.warningBox, isRide && styles.warningBoxRide]}>
  {/* Conteúdo condicional */}
</View>
```

---

## 🎯 Navegação e UX

### Indicador de Progresso

```typescript
<View style={styles.progressContainer}>
  {Array.from({ length: totalSteps }).map((_, index) => (
    <View
      key={index}
      style={[
        styles.progressDot,
        index + 1 <= currentStep && styles.progressDotActive,
        index + 1 === currentStep && styles.progressDotCurrent,
      ]}
    />
  ))}
</View>
<Text style={styles.progressText}>
  Etapa {currentStep} de {totalSteps}
</Text>
```

**Visual:**
- Dots cinzas (#334155) para steps não atingidos
- Dots verdes (#10b981) para steps completados
- Dot verde maior (14x14) para step atual
- Texto: "Etapa X de Y"

---

### Botões de Navegação

**Voltar:**
- Estilo: Botão branco com texto preto
- Ícone: chevron-back
- Comportamento:
  - Step > 1: volta para step anterior
  - Step = 1: fecha o wizard (onClose)

**Avançar / Confirmar:**
- Estilo: Botão verde (#10b981)
- Ícone:
  - chevron-forward (não é último step)
  - checkmark-circle (último step)
- Texto:
  - "Avançar" (não é último step)
  - "Confirmar" (último step)
- Disabled: quando validação falha
- Loading: ActivityIndicator branco durante submit

---

## ✅ Validações

### Validação por Etapa

| Etapa | Tipo | Validação |
|-------|------|-----------|
| 1 | Ambos | Sempre válido (default: DELIVERY) |
| 2 | Ambos | `fromAddress.trim().length > 0` |
| 3 | Ambos | `toAddress.trim().length > 0` |
| 4 | DELIVERY | `itemDescription && recipientName && recipientPhone` |
| 4 | RIDE | Pula para confirmação |
| 5 | DELIVERY | `totalAmount.trim().length > 0` |
| 4 | RIDE | `totalAmount.trim().length > 0` |

---

### Validação de Pagamento (Submit)

**RIDE:**
```typescript
const preference = await paymentService.getPaymentPreference();

if (preference.preferredPaymentMethod === 'PIX') {
  Alert.alert(
    '⚠️ RIDE Requer Cartão',
    'Viagens (RIDE) só podem ser pagas com cartão.',
    [{ text: 'OK' }]
  );
  return;
}

if (!preference.defaultCardId) {
  const hasCards = await paymentService.hasCards();
  if (!hasCards) {
    Alert.alert(
      '⚠️ Cartão Necessário',
      'Você precisa cadastrar um cartão para criar viagens (RIDE).',
      [{ text: 'OK' }]
    );
    return;
  }
}
```

**DELIVERY:**
- Aceita PIX ou Cartão
- Sem validações especiais

---

## 🚀 Integração no MainApp

### Como Integrar

1. **Importar o Wizard:**
```typescript
import CreateDeliveryWizard from './components/delivery/CreateDeliveryWizard';
```

2. **Substituir CreateDeliveryModal:**
```typescript
// Antes:
<CreateDeliveryModal
  visible={showCreateDeliveryModal}
  onClose={() => setShowCreateDeliveryModal(false)}
  onSuccess={handleDeliveryCreated}
/>

// Depois:
<CreateDeliveryWizard
  visible={showCreateDeliveryModal}
  onClose={() => setShowCreateDeliveryModal(false)}
  onSuccess={handleDeliveryCreated}
  userLocation={userLocation}
/>
```

3. **Passar userLocation:**
```typescript
const userLocation = unifiedLocationService.getCurrentLocation();

<CreateDeliveryWizard
  userLocation={userLocation}
  // ... outras props
/>
```

---

## 🎨 Paleta de Cores

| Elemento | Cor | Hex |
|----------|-----|-----|
| Background | Azul escuro | #0f172a |
| Cards | Cinza escuro | #1e293b |
| Bordas | Cinza médio | #334155 |
| Texto primário | Branco | #fff |
| Texto secundário | Cinza claro | #94a3b8 |
| Verde (sucesso/ativo) | Verde | #10b981 |
| Azul (DELIVERY) | Azul | #3b82f6 |
| Roxo (RIDE) | Roxo | #8b5cf6 |
| Vermelho (destino) | Vermelho | #ef4444 |
| Hints | Cinza escuro | #64748b |

---

## 📊 Benefícios da Abordagem Wizard

### ✅ Vantagens

1. **UX Melhorada**
   - Menos campos visíveis por vez
   - Sensação de progresso visual
   - Menos scroll necessário
   - Foco em uma tarefa por vez

2. **Validação Incremental**
   - Não permite avançar sem preencher
   - Feedback imediato por etapa
   - Menos erros no submit final

3. **Fluxos Diferentes**
   - RIDE: 4 steps (mais simples)
   - DELIVERY: 5 steps (mais completo)
   - Condicional sem confusão

4. **Clareza Visual**
   - Indicador de progresso (dots)
   - Título dinâmico do header
   - Botão "Confirmar" só no final

5. **Navegação Intuitiva**
   - Voltar preserva dados
   - Avançar com validação
   - Fechar a qualquer momento

### ❌ Desvantagens Eliminadas

| Problema Anterior | Solução Wizard |
|-------------------|----------------|
| Formulário longo com scroll | Dividido em 4-5 steps pequenos |
| Campos DELIVERY/RIDE misturados | Fluxos separados condicionalmente |
| Validação só no submit | Validação incremental por step |
| Sem feedback de progresso | Dots indicadores + "Etapa X de Y" |
| Difícil voltar e editar | Botão "Voltar" preserva tudo |

---

## 🔄 Fluxo de Dados

```
┌─────────────────────────────────────────────────┐
│  CreateDeliveryWizard (Estado Central)          │
│  ┌───────────────────────────────────────────┐  │
│  │ wizardData: WizardData                    │  │
│  │ - deliveryType                            │  │
│  │ - fromAddress, fromLat, fromLng           │  │
│  │ - toAddress, toLat, toLng                 │  │
│  │ - itemDescription, recipientName, phone   │  │
│  │ - distanceKm, totalAmount                 │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
         │
         ├─► Step 1: onSelectType(type)
         │   └─► updateWizardData({ deliveryType })
         │
         ├─► Step 2: onUpdate({ fromAddress, fromLat, fromLng })
         │   └─► updateWizardData({ ...updates })
         │
         ├─► Step 3: onUpdate({ toAddress, toLat, toLng, distanceKm })
         │   └─► updateWizardData({ ...updates })
         │
         ├─► Step 4: onUpdate({ itemDescription, recipientName, recipientPhone })
         │   └─► updateWizardData({ ...updates })
         │
         └─► Step 4/5: onUpdateAmount(amount)
             └─► updateWizardData({ totalAmount })
```

**Fluxo Unidirecional:**
1. Step atualiza seu estado local
2. Step chama callback `onUpdate` ou `onUpdateAmount`
3. Wizard atualiza `wizardData` central
4. Props fluem de volta para o step (controlled components)

---

## 🧪 Casos de Teste

### Teste 1: Fluxo RIDE Completo
1. Abrir wizard
2. Selecionar RIDE
3. Preencher origem (usar GPS)
4. Preencher destino (inserir coordenadas)
5. Verificar cálculo de distância
6. Inserir valor
7. Verificar aviso "Pago quando motorista iniciar"
8. Confirmar
9. Validar que exige cartão

### Teste 2: Fluxo DELIVERY Completo
1. Abrir wizard
2. Selecionar DELIVERY
3. Preencher origem
4. Preencher destino
5. Preencher detalhes (item + destinatário)
6. Inserir valor
7. Verificar aviso "Pago quando motoboy aceitar"
8. Confirmar
9. Verificar criação com sucesso

### Teste 3: Navegação
1. Avançar até step 3
2. Clicar "Voltar"
3. Verificar que dados foram preservados
4. Avançar novamente
5. Verificar consistência dos dados

### Teste 4: Validação
1. Tentar avançar sem preencher campos
2. Verificar botão "Avançar" desabilitado
3. Preencher campos
4. Verificar botão habilitado

### Teste 5: Cálculo de Distância
1. Inserir origem com coordenadas
2. Inserir destino com coordenadas
3. Verificar cálculo automático
4. Verificar display em km

---

## 📝 TODO / Melhorias Futuras

- [ ] Adicionar animações entre steps (slide left/right)
- [ ] Implementar "Editar" na tela de confirmação
- [ ] Salvar rascunho no AsyncStorage
- [ ] Adicionar histórico de endereços recentes
- [ ] Sugerir valor baseado na distância
- [ ] Validação de CEP/formato de endereço
- [ ] Integração com Google Maps Places API
- [ ] Adicionar foto do item (câmera/galeria)
- [ ] Preview do mapa na confirmação
- [ ] Compartilhar link de rastreamento

---

## 🎓 Boas Práticas Aplicadas

1. **Separation of Concerns**
   - Cada step é um componente isolado
   - Wizard apenas orquestra a navegação
   - Validação centralizada no wizard

2. **Controlled Components**
   - Props → Local State → Callback
   - Estado central no wizard
   - Fluxo unidirecional de dados

3. **TypeScript Strict**
   - Todas as interfaces tipadas
   - Props explícitas
   - Sem `any` implícito

4. **Acessibilidade**
   - Labels descritivos
   - Placeholders informativos
   - Hints com dicas
   - Contrast ratio adequado

5. **Performance**
   - useEffect com dependências corretas
   - Cálculo de distância otimizado
   - Renderização condicional eficiente

6. **Responsividade**
   - KeyboardAvoidingView
   - SafeAreaView insets
   - ScrollView onde necessário
   - Layouts flexíveis

---

## 📚 Referências

- [React Navigation Wizard Pattern](https://reactnavigation.org/)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
- [Ionicons](https://ionic.io/ionicons)
- [React Native Typography](https://reactnative.dev/docs/text)
- [React Native Keyboard](https://reactnative.dev/docs/keyboardavoidingview)

---

**Última Atualização:** 2024-01-XX  
**Autor:** Equipe de Desenvolvimento  
**Status:** ✅ Implementado e Pronto para Uso
