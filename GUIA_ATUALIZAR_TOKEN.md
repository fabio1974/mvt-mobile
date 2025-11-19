# 🚀 GUIA RÁPIDO - Atualizar Token Push para REAL

## ✅ O que foi feito:

1. ❌ **Removido**: Fallback de token DEV
2. ✅ **Adicionado**: Logs detalhados do processo
3. ✅ **Forçado**: Sempre obter token REAL do Expo
4. ✅ **Verificação**: Logs mostram tipo do token

## 📱 PASSO A PASSO - iPhone

### 1. Fechar o App Completamente
```
1. Swipe up no iPhone (abrir multitask)
2. Swipe up no app MVT Mobile para fechá-lo
3. Aguarde 5 segundos
```

### 2. Abrir o App Novamente
```
1. Toque no ícone MVT Mobile
2. Aguarde carregar
```

### 3. Fazer Login
```
Username: motoboy1@gmail.com
Password: [sua senha]
```

### 4. Aceitar Permissões
```
⚠️ IMPORTANTE: Quando aparecer o popup de notificações, clique em "Permitir"
```

### 5. Verificar Logs no Metro Bundler
Você deve ver:
```
📱 ==========================================
📱 Solicitando token REAL do Expo Push...
📱 Platform: ios
📱 __DEV__: true
📱 ==========================================
✅ ==========================================
✅ Token Expo REAL obtido com sucesso!
✅ Tipo: ExponentPushToken[...
✅ Token completo: ExponentPushToken[XXXXXXXXXXXXXXXXXXXX]
✅ É ExponentPushToken? true
✅ É ExpoToken? false
✅ ==========================================
📤 Enviando token REAL para backend...
📡 =============== ENVIANDO TOKEN PUSH PARA SEU BACKEND ===============
✅ ==========================================
✅ Token REAL registrado no backend!
✅ ==========================================
```

### 6. Verificar no Banco de Dados

Execute no terminal:
```bash
cd /home/fbarros/Documents/projects/mvt-events

docker exec -it mvt-events-db psql -U mvt -d mvt-events -c "
SELECT 
    substring(token, 1, 30) as token_inicio,
    CASE 
        WHEN token LIKE 'ExponentPushToken%' THEN '✅ REAL'
        WHEN token LIKE 'ExpoToken[DEV_%' THEN '❌ DEV'  
        ELSE '❓ OUTRO'
    END as tipo,
    created_at
FROM user_push_tokens 
WHERE is_active = true 
ORDER BY created_at DESC 
LIMIT 1;"
```

**Resultado Esperado:**
```
      token_inicio       | tipo   |         created_at         
-------------------------+--------+----------------------------
 ExponentPushToken[XXXXX | ✅ REAL | 2025-11-06 XX:XX:XX
```

## 🧪 TESTAR PUSH NOTIFICATION

### Opção 1: Usar o menu de teste do app
```
1. No app, clique no botão 🧪 (canto inferior direito)
2. Clique em "🔔 Testar Push Local"
3. Deve aparecer notificação imediatamente
```

### Opção 2: Enviar do Backend via cURL

**Pegue o token do log:**
```
✅ Token completo: ExponentPushToken[XXXXXXXXXXXXXXXXXXXX]
```

**Execute o comando:**
```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[SEU_TOKEN_AQUI]",
    "title": "🚚 Teste Push Real!",
    "body": "Notificação enviada via cURL do backend",
    "data": {
      "type": "delivery_invite",
      "deliveryId": "test123"
    },
    "sound": "default",
    "priority": "high"
  }'
```

**Resposta Esperada:**
```json
{
  "data": [
    {
      "status": "ok",
      "id": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
    }
  ]
}
```

### Opção 3: Enviar do Backend Node.js

Se seu backend usa Node.js, use o código do arquivo `BACKEND_SEND_PUSH.md`

## 🔍 Troubleshooting

### ❌ Problema: Token ainda é DEV

**Logs mostram:**
```
⚠️ Token fallback: ExpoToken[DEV_...]
```

**Solução:**
1. Verifique se está usando a NOVA versão do código
2. Reinicie o Metro Bundler (Ctrl+C no terminal, depois `npm start`)
3. Force reload no app (shake → Reload)

### ❌ Problema: Erro ao obter token

**Logs mostram:**
```
❌ ERRO CRÍTICO ao registrar token push!
```

**Solução:**
1. Verifique se aceitou permissões de notificação
2. Vá em Configurações > MVT Mobile > Notificações → Ative
3. Reinicie o app

### ❌ Problema: Notificação não chega

**Checklist:**
- [ ] Token no banco é REAL (ExponentPushToken)?
- [ ] App está aberto ou em background (não fechado)?
- [ ] Permissões de notificação estão ativadas?
- [ ] Token no cURL está correto?
- [ ] Resposta do Expo é `"status": "ok"`?

## 📊 Diferenças entre Tokens

### Token DEV (ANTIGO - NÃO FUNCIONA)
```
ExpoToken[DEV_1762395815097_2p0xsxqbk]
```
- ❌ Gerado localmente pelo app
- ❌ Não está registrado no Expo
- ❌ Push notifications NÃO funcionam

### Token REAL (NOVO - FUNCIONA!)
```
ExponentPushToken[XXXXXXXXXXXXXXXXXXXX]
```
- ✅ Gerado pelo servidor Expo
- ✅ Registrado no Expo Push Service
- ✅ Push notifications FUNCIONAM!

## 🎯 Próximos Passos

Após confirmar que o token REAL está no banco:

1. ✅ Testar push do backend
2. ✅ Implementar envio automático quando criar entrega
3. ✅ Testar fluxo completo: Criar entrega → Motoboy recebe notificação
4. ✅ Implementar lógica de aceitar/rejeitar entrega

## 📝 Comandos Úteis

### Ver todos os tokens no banco
```bash
docker exec -it mvt-events-db psql -U mvt -d mvt-events -c "
SELECT 
    id,
    user_id,
    substring(token, 1, 30) as token,
    CASE 
        WHEN token LIKE 'ExponentPushToken%' THEN '✅ REAL'
        WHEN token LIKE 'ExpoToken[DEV_%' THEN '❌ DEV'  
        ELSE '❓ OUTRO'
    END as tipo,
    is_active,
    created_at
FROM user_push_tokens 
ORDER BY created_at DESC;"
```

### Deletar tokens antigos (DEV)
```bash
docker exec -it mvt-events-db psql -U mvt -d mvt-events -c "
DELETE FROM user_push_tokens 
WHERE token LIKE 'ExpoToken[DEV_%';"
```

### Verificar token de um usuário específico
```bash
docker exec -it mvt-events-db psql -U mvt -d mvt-events -c "
SELECT u.email, t.token, t.created_at
FROM user_push_tokens t
JOIN users u ON u.id = t.user_id
WHERE u.email = 'motoboy1@gmail.com'
ORDER BY t.created_at DESC
LIMIT 1;"
```

## ✅ Sucesso!

Se você vê:
- ✅ Token REAL nos logs
- ✅ Token REAL no banco
- ✅ Notificação recebida no teste

**Parabéns! Push Notifications estão funcionando! 🎉**
