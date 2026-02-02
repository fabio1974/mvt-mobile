# 📱 Guia Rápido - Desenvolvimento React Native/Expo com Metro Bundler

## 🚀 Comando Principal para Rodar o App em Desenvolvimento

```bash
cd /Users/fabio2barros/Documents/projects/mvt-mobile && npx expo run:android
```

**O que esse comando faz:**
- Compila o código nativo Android
- Gera e instala o APK debug no dispositivo conectado
- **Inicia automaticamente o Metro Bundler** (servidor JavaScript)
- Conecta o app ao Metro para hot reload
- Abre o app no celular
- Exibe logs em tempo real no terminal

**Quando usar:** Sempre que precisar rodar o app em modo desenvolvimento com conexão ao Metro para ver logs e ter hot reload.

---

## 🔄 Se o Metro travar ou der erro de cache

```bash
pkill -f "expo start" && npx expo run:android
```

**Ou para limpar cache do Metro:**

```bash
cd /Users/fabio2barros/Documents/projects/mvt-mobile && npx expo start --clear
```

Depois em outro terminal:
```bash
npx expo run:android
```

---

## 📊 Como Ver os Logs

**Opção 1:** Os logs já aparecem automaticamente no terminal onde rodou `npx expo run:android`

**Opção 2:** Terminal separado só para logs do Android (mais detalhado):
```bash
adb logcat | grep -E "ReactNativeJS|Zapi10|mvt-mobile"
```

**Opção 3:** Ver TODOS os logs do sistema Android:
```bash
adb logcat
```

---

## ⚡ Atalhos Durante Execução

Quando o Metro estiver rodando, você pode pressionar no terminal:

- **`r`** - Recarrega o app (após fazer alterações no código)
- **`a`** - Abre/reinstala o app no Android
- **`j`** - Abre o debugger
- **`m`** - Abre o menu de desenvolvedor no app
- **Ctrl+C** - Para o Metro e encerra

---

## 🔧 Checklist Antes de Rodar

1. **Dispositivo conectado:**
   ```bash
   adb devices
   ```
   Deve mostrar seu dispositivo listado

2. **Servidor local rodando:**
   - Backend deve estar em `http://192.168.18.162:8080`
   - Configurado em `src/config/env.ts`

3. **Verificar IP da máquina (se necessário):**
   ```bash
   ipconfig getifaddr en0 || ipconfig getifaddr en1
   ```
   Se o IP mudou, atualizar em `src/config/env.ts`

---

## 📦 Build APK Standalone (sem Metro)

**Para gerar APK de debug sem precisar do Metro:**
```bash
cd android && ./gradlew assembleDebug
```

**Instalar APK manualmente:**
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

⚠️ **Nota:** Esse APK não terá hot reload e não mostrará logs no terminal automaticamente.

---

## 💡 Diferença entre os Métodos

| Método | Metro | Hot Reload | Logs em Tempo Real | Uso |
|--------|-------|------------|-------------------|-----|
| `npx expo run:android` | ✅ Sim | ✅ Sim | ✅ Sim | Desenvolvimento |
| `./gradlew assembleDebug` | ❌ Não | ❌ Não | ❌ Não | Testes manuais |

---

## 🎯 Comando Completo para Copiar/Colar

Para rodar tudo de uma vez (limpa cache + compila + roda):

```bash
cd /Users/fabio2barros/Documents/projects/mvt-mobile && pkill -f "expo start" 2>/dev/null; npx expo run:android
```

**Use este comando quando quiser começar do zero com tudo limpo!**

---

## 🐛 Troubleshooting

### "Unable to load script"
- O Metro Bundler não está rodando ou foi parado
- Solução: Rodar `npx expo run:android` novamente

### "Network Error" ao fazer login
- O IP do servidor mudou
- Verificar IP atual: `ipconfig getifaddr en0`
- Atualizar em `src/config/env.ts` na variável `API_URL`
- Recarregar app pressionando `r` no Metro

### Cache do Metro desatualizado
```bash
npx expo start --clear
```

### Dispositivo não detectado
```bash
adb devices
# Se não aparecer nada, reconectar USB ou reiniciar adb:
adb kill-server
adb start-server
```

---

## 📝 Estrutura do Projeto

```
mvt-mobile/
├── src/
│   ├── config/
│   │   └── env.ts              # Configurações de ambiente (API_URL)
│   ├── screens/
│   │   ├── MainApp.tsx         # Tela principal
│   │   ├── BankAccountScreen.tsx
│   │   ├── WithdrawalSettingsScreen.tsx
│   │   ├── ChangePasswordScreen.tsx
│   │   └── ...
│   ├── components/
│   │   └── SideMenu.tsx        # Menu lateral
│   └── services/
│       ├── api.ts              # Cliente HTTP
│       └── bankAccountService.ts
├── android/                     # Código nativo Android
├── ios/                         # Código nativo iOS
├── package.json
└── app.json
```

---

## 🔐 Novas Funcionalidades Implementadas

### 1. Configuração de Saque Automático
- Localização: Menu lateral → "Configuração de Saque"
- Endpoint: `PUT /api/bank-accounts/:id`
- Funcionalidades:
  - Escolher frequência: Diário, Semanal, Mensal
  - Selecionar dia (semana ou mês)
  - Toggle de habilitação
  - Alertas sobre custos

### 2. Alterar Senha
- Localização: Menu lateral → "Alterar Senha"
- Endpoint: `POST /api/auth/change-password`
- Funcionalidades:
  - Validação de senha atual
  - Nova senha (mínimo 6 caracteres)
  - Confirmação de senha
  - Modal de sucesso com redirecionamento

---

## 📞 Comandos Úteis

```bash
# Ver IP atual da máquina
ipconfig getifaddr en0

# Ver dispositivos conectados
adb devices

# Instalar APK
adb install -r caminho/do/app.apk

# Ver logs em tempo real
adb logcat | grep "ReactNativeJS"

# Limpar cache do Metro
npx expo start --clear

# Matar processos do Expo
pkill -f "expo start"

# Recarregar app remotamente
adb shell input text "RR"
```

---

## 🎨 Padrões de Código

### Cores principais
- Header: `#0f0f23`
- Primária: `#3b82f6`
- Sucesso: `#10b981`
- Alerta: `#f59e0b`
- Erro: `#dc2626`

### Estrutura de telas
1. StatusBar com estilo "light"
2. Header fixo no topo com `paddingTop: insets.top + 10`
3. ScrollView para conteúdo
4. Footer fixo com botões de ação

### Modal de sucesso padrão
- Ícone grande (64px) no topo
- Título e subtítulo
- Card com detalhes
- Avisos se necessário
- Botão de confirmação que redireciona
