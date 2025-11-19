# 🔍 DEBUG - Push Notifications Não Chegam no iPhone

## 📋 CHECKLIST DE TESTES (Execute nesta ordem)

### ✅ TESTE 1: Verificar Permissões no iOS

**No iPhone:**
1. Vá em **Configurações**
2. Role até encontrar **Expo Go**
3. Toque em **Notificações**
4. Verifique se está **ATIVADO**
5. Certifique-se que:
   - ✅ Permitir Notificações: **LIGADO**
   - ✅ Sons: **LIGADO**
   - ✅ Alertas: **LIGADO**
   - ✅ Crachás: **LIGADO**

**Status Esperado:** Tudo VERDE/ATIVADO

---

### ✅ TESTE 2: Verificar Status no App

**No App MVT Mobile:**
1. Abra o menu de teste (botão 🧪)
2. Clique em **"🔍 Ver Status Completo"**
3. Veja o popup com informações

**O que deve aparecer:**
```
📱 Status das Notificações:

Permissões: ✅ CONCEDIDAS
Can Ask: Não
iOS Settings: {...}

Token Push: ✅ ExponentPushToken[...]
Serviço: ✅ Pronto
```

**❌ Se aparecer "Permissões: ❌ NEGADAS":**
- Vá em Configurações do iOS e ative (ver TESTE 1)
- Volte ao app e clique em "🔐 Solicitar Permissões"

---

### ✅ TESTE 3: Testar Notificação Local

**No App:**
1. Clique em **"🔔 Testar Notificação Local"**
2. Aguarde 2 segundos
3. Deve aparecer uma notificação no topo do iPhone

**✅ Se apareceu notificação:**
- Sistema de notificações funciona!
- Problema está no recebimento de notificações remotas

**❌ Se NÃO apareceu:**
- Permissões estão bloqueadas
- Volte ao TESTE 1 e verifique Configurações do iOS

---

### ✅ TESTE 4: Verificar Token no Backend

**No terminal do servidor:**
```bash
docker exec -it mvt-events-db psql -U mvt -d mvt-events -c "
SELECT 
    user_id,
    substring(token, 1, 30) as token_inicio,
    CASE 
        WHEN token LIKE 'ExponentPushToken%' THEN '✅ REAL'
        WHEN token LIKE 'ExpoToken[DEV_%' THEN '❌ DEV'  
        ELSE '❓ OUTRO'
    END as tipo,
    is_active,
    created_at
FROM user_push_tokens 
WHERE user_id = '6186c7af-2311-4756-bfc6-ce98bd31ed27'
ORDER BY created_at DESC 
LIMIT 1;"
```

**Resultado Esperado:**
```
      token_inicio       | tipo    | is_active
-------------------------+---------+-----------
 ExponentPushToken[2nCfz | ✅ REAL | t
```

**❌ Se tipo = ❌ DEV:**
- No app, clique em "📡 Re-enviar Token Push"
- Execute o comando novamente

---

### ✅ TESTE 5: Enviar Notificação do Backend

**Copie o token COMPLETO do banco:**
```bash
docker exec -it mvt-events-db psql -U mvt -d mvt-events -t -A -c "
SELECT token FROM user_push_tokens 
WHERE user_id = '6186c7af-2311-4756-bfc6-ce98bd31ed27' 
AND is_active = true 
ORDER BY created_at DESC 
LIMIT 1;"
```

**Envie via cURL:**
```bash
TOKEN="ExponentPushToken[SEU_TOKEN_AQUI]"

curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$TOKEN\",
    \"title\": \"🧪 Teste Manual\",
    \"body\": \"Esta notificação foi enviada manualmente via cURL\",
    \"sound\": \"default\",
    \"priority\": \"high\",
    \"channelId\": \"delivery\"
  }"
```

**Resposta Esperada:**
```json
{
  "data": [{
    "status": "ok",
    "id": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
  }]
}
```

---

### ✅ TESTE 6: Notificação com App em Background

**IMPORTANTE:** Notificações remotas do Expo podem não aparecer com o app ABERTO.

**Teste:**
1. Feche o app (pressione Home, não swipe up)
2. Aguarde 5 segundos
3. Envie notificação via cURL (TESTE 5)
4. Aguarde 10 segundos
5. Verifique se notificação apareceu

**Se aparecer:** ✅ FUNCIONOU! O problema era app em foreground

---

### ✅ TESTE 7: App Completamente Fechado

1. **Feche o app COMPLETAMENTE** (swipe up no App Switcher)
2. Aguarde 5 segundos
3. Envie notificação via cURL
4. Aguarde 10 segundos
5. Verifique se notificação apareceu

---

## 🔧 SOLUÇÕES POR PROBLEMA

### ❌ Problema: Notificação local funciona, mas remota não

**Causa:** Configuração do Expo ou limitações do Expo Go

**Solução:**
1. Verificar se o `projectId` está correto no `app.json`
2. Confirmar que o token no backend é `ExponentPushToken` (não `ExpoToken[DEV_`)
3. Testar com app em background (não aberto)

---

### ❌ Problema: Token é DEV, não REAL

**Solução:**
1. No app, clique em "📡 Re-enviar Token Push"
2. Veja nos logs:
```
✅ Token Expo REAL obtido com sucesso!
✅ Token completo: ExponentPushToken[...]
```
3. Verifique no banco novamente

---

### ❌ Problema: Permissões negadas

**Solução:**
1. Configurações iOS > Notificações > Expo Go > **ATIVAR TUDO**
2. Feche o app completamente
3. Abra novamente
4. No app, clique em "🔐 Solicitar Permissões"

---

### ❌ Problema: Erro 400 ao enviar notificação

**Resposta:**
```json
{
  "data": [{
    "status": "error",
    "message": "\"ExponentPushToken[...]\" is not a registered push notification recipient"
  }]
}
```

**Solução:**
1. Token está inválido ou expirou
2. Re-gere o token no app
3. No app: "📡 Re-enviar Token Push"
4. Tente enviar novamente

---

## 📱 Limitações do Expo Go

### O que FUNCIONA no Expo Go:
- ✅ Notificações locais (agendadas pelo próprio app)
- ✅ Testes de permissões
- ✅ Recebimento de notificações remotas (com limitações)

### O que NÃO funciona ou tem limitações:
- ⚠️ Notificações podem não aparecer com app em primeiro plano
- ⚠️ Background notifications podem ter delay
- ⚠️ Notificações personalizadas (som customizado, etc)

### Para produção (build standalone):
- ✅ Todas as funcionalidades disponíveis
- ✅ Notificações funcionam perfeitamente
- ✅ App pode estar fechado, em background ou aberto

---

## 🎯 DIAGNÓSTICO RÁPIDO

Execute este checklist:

- [ ] Permissões ativadas no iOS? (TESTE 1)
- [ ] Status mostra "✅ CONCEDIDAS"? (TESTE 2)
- [ ] Notificação local aparece? (TESTE 3)
- [ ] Token no banco é REAL? (TESTE 4)
- [ ] cURL retorna status "ok"? (TESTE 5)
- [ ] Testou com app em background? (TESTE 6)
- [ ] Testou com app fechado? (TESTE 7)

**Se TODOS estiverem ✅ mas notificação não chega:**
- Problema pode ser limitação do Expo Go em iOS
- Crie um build standalone para testar
- Ou aguarde até 30 segundos (pode haver delay)

---

## 📊 Comandos Úteis de Debug

### Ver todos os tokens ativos:
```bash
docker exec -it mvt-events-db psql -U mvt -d mvt-events -c "
SELECT 
    u.email,
    substring(t.token, 1, 40) as token,
    CASE 
        WHEN t.token LIKE 'ExponentPushToken%' THEN '✅'
        ELSE '❌'
    END as ok,
    t.created_at
FROM user_push_tokens t
JOIN users u ON u.id = t.user_id
WHERE t.is_active = true
ORDER BY t.created_at DESC;"
```

### Deletar tokens antigos (DEV):
```bash
docker exec -it mvt-events-db psql -U mvt -d mvt-events -c "
DELETE FROM user_push_tokens 
WHERE token LIKE 'ExpoToken[DEV_%' OR token LIKE 'ExpoToken[DEV%';"
```

### Ver histórico de deliveries:
```bash
docker exec -it mvt-events-db psql -U mvt -d mvt-events -c "
SELECT 
    id,
    status,
    created_at,
    assigned_courier_id
FROM deliveries 
ORDER BY created_at DESC 
LIMIT 5;"
```

---

## ✅ Sucesso!

Se seguir TODOS os testes e a notificação chegar, parabéns! 🎉

**Próximos passos:**
1. Criar entrega real no sistema
2. Verificar se notificação chega automaticamente
3. Implementar lógica de aceitar/rejeitar entrega

**Se ainda não funcionar:**
- Considere criar um build standalone (não Expo Go)
- Verifique logs do backend para ver se há erros
- Teste em outro iPhone para descartar problemas do dispositivo
