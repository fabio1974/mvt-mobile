# 🚀 Guia de Deploy para Google Play Store

## 📋 Pré-requisitos

- [ ] Conta Google Play Console (US$ 25 taxa única)
- [ ] Conta Expo/EAS Build
- [ ] App configurado no Google Play Console

---

## 📦 Passo 1: Gerar o Android App Bundle (AAB)

O Google Play requer arquivos `.aab` (Android App Bundle) para publicação.

### Opção A: Build com EAS (Recomendado)

```bash
# Instalar EAS CLI (se ainda não tiver)
npm install -g eas-cli

# Fazer login no Expo
eas login

# Configurar o projeto (primeira vez)
eas build:configure

# Gerar o AAB para produção
eas build --platform android --profile production
```

### Opção B: Build APK para teste local

```bash
# Gerar APK para instalar no seu dispositivo
eas build --platform android --profile production-apk
```

**⏱️ Tempo estimado:** 10-20 minutos

---

## 🔐 Passo 2: Configurar Assinatura do App

### Primeira build:
- O EAS vai gerar automaticamente as chaves de assinatura
- Essas chaves ficam armazenadas com segurança no Expo
- **IMPORTANTE:** Use a mesma conta Expo para futuras atualizações

### Se já tem keystore:
```bash
# Upload do keystore existente
eas credentials
```

---

## 📱 Passo 3: Preparar Assets para Google Play

Você vai precisar:

### Screenshots (obrigatório)
- Pelo menos 2 screenshots
- Tamanho: 16:9 ou 9:16
- Resolução mínima: 320px
- Formatos: PNG ou JPG

### Ícone de alta resolução (obrigatório)
- 512 x 512 pixels
- PNG de 32 bits
- Usar o arquivo: `assets/icon.png`

### Feature Graphic (obrigatório)
- 1024 x 500 pixels
- PNG ou JPG
- Aparece no topo da página do app

### Vídeo promocional (opcional)
- Link do YouTube

---

## 🌐 Passo 4: Upload no Google Play Console

### 4.1. Criar o App no Console

1. Acesse: https://play.google.com/console
2. Clique em **"Criar app"**
3. Preencha:
   - **Nome:** Zapi10
   - **Idioma padrão:** Português (Brasil)
   - **Tipo:** App
   - **Gratuito/Pago:** Gratuito
   - **Categoria:** Negócios ou Produtividade

### 4.2. Informações Obrigatórias

**Ficha da loja:**
- **Descrição curta** (max 80 caracteres):
  ```
  Gerenciamento de entregas para motoboys. Aceite corridas e otimize rotas.
  ```

- **Descrição completa** (max 4000 caracteres):
  ```
  Zapi10 - Seu parceiro para gestão de entregas

  O Zapi10 é um aplicativo completo para motoristas de entrega (motoboys) que desejam 
  gerenciar suas corridas de forma eficiente e profissional.

  🚚 FUNCIONALIDADES PRINCIPAIS:
  • Receba notificações de novas entregas em tempo real
  • Visualize e aceite corridas disponíveis
  • Tracking de localização GPS em tempo real
  • Gerenciamento de entregas ativas
  • Histórico completo de corridas
  • Otimização de rotas com Google Maps

  📍 LOCALIZAÇÃO EM TEMPO REAL:
  • Sistema de GPS preciso para tracking
  • Atualizações automáticas de localização
  • Compartilhamento de localização com a central

  🔔 NOTIFICAÇÕES:
  • Alertas instantâneos de novas corridas
  • Notificações de status de entrega
  • Sistema de convites para entregas

  👤 PERFIL DO ENTREGADOR:
  • Gestão de dados pessoais
  • Configurações de senha
  • Dados bancários
  • Suporte integrado

  💼 IDEAL PARA:
  • Motoboys profissionais
  • Entregadores autônomos
  • Empresas de delivery
  • Logística de última milha

  Baixe agora e comece a otimizar suas entregas com o Zapi10!
  ```

- **Screenshots:** Adicione pelo menos 2 prints do app
- **Ícone do app:** Upload do `assets/icon.png` (512x512)
- **Feature Graphic:** Crie uma imagem 1024x500 promocional

**Classificação de conteúdo:**
1. Preencha o questionário
2. Para apps de delivery, geralmente é classificado como "Para todos"

**Público-alvo:**
- Marque: Maiores de 18 anos (motoristas)

**Detalhes do app:**
- Categoria: **Negócios** ou **Produtividade**
- E-mail de contato: Seu e-mail
- Política de privacidade: URL (obrigatório para apps com login)
- Tags: delivery, entrega, motoboy, logística

### 4.3. Upload do AAB

1. No menu lateral, vá em: **Produção** → **Versões**
2. Clique em **Criar nova versão**
3. Faça upload do arquivo `.aab` gerado no Passo 1
4. Preencha as **Notas da versão** (o que há de novo):
   ```
   Versão inicial do Zapi10:
   • Sistema de gerenciamento de entregas
   • Notificações em tempo real
   • Tracking GPS de localização
   • Interface intuitiva para motoboys
   • Sistema de aceite de corridas
   ```

### 4.4. Países e Regiões
- Selecione **Brasil** (ou outros países desejados)

### 4.5. Testers Internos (opcional, mas recomendado)
1. Crie uma lista de testers internos
2. Adicione e-mails dos testadores
3. Publique primeiro para teste interno antes da produção

---

## 🔍 Passo 5: Revisão e Publicação

### 5.1. Checklist antes de enviar:

- [ ] Todas as informações da ficha da loja preenchidas
- [ ] Screenshots adicionados (mínimo 2)
- [ ] Ícone 512x512 adicionado
- [ ] Feature Graphic 1024x500 adicionado
- [ ] Classificação de conteúdo completa
- [ ] Política de privacidade URL fornecida
- [ ] AAB enviado com sucesso
- [ ] Notas da versão escritas

### 5.2. Enviar para Revisão

1. Clique em **"Revisar versão"**
2. Corrija quaisquer avisos ou erros
3. Clique em **"Iniciar lançamento para produção"**

⏱️ **Tempo de revisão:** Geralmente 1-3 dias úteis

---

## 📊 Passo 6: Após Aprovação

### Monitoramento:
- Acompanhe downloads e avaliações no console
- Responda a avaliações de usuários
- Monitore relatórios de crashes (se houver)

### Atualizações futuras:
```bash
# Incrementar versionCode no app.json
# Depois executar:
eas build --platform android --profile production

# Upload do novo AAB no Google Play Console
# Sempre em Produção → Versões → Nova versão
```

---

## 🛠️ Comandos Úteis

```bash
# Ver status dos builds
eas build:list

# Baixar o AAB gerado
eas build:download --platform android

# Ver credenciais do app
eas credentials

# Configurar submit automático (após aprovação inicial)
eas submit --platform android
```

---

## 📝 Informações do App

- **Package Name:** com.mvt.mobile.zapi10
- **Version Code:** 1 (auto-incrementa)
- **Version Name:** 1.0.0
- **Target SDK:** Android 14+ (API 34)
- **Min SDK:** Android 6.0+ (API 23)

---

## ⚠️ Problemas Comuns

### Build falha:
- Verifique se todas as dependências estão instaladas
- Limpe cache: `npm install && npx expo install --fix`

### Rejeição do Google Play:
- **Faltando política de privacidade:** Crie uma página com sua política
- **Permissões não justificadas:** Adicione texto explicando uso de localização
- **Screenshots inadequados:** Use capturas reais do app funcionando

### AAB muito grande:
- Otimize imagens em `assets/`
- Remova dependências não usadas
- Use `npx expo install --fix` para versões otimizadas

---

## 📞 Suporte

- **Expo/EAS:** https://docs.expo.dev/build/introduction/
- **Google Play:** https://support.google.com/googleplay/android-developer
- **Console:** https://play.google.com/console

---

## ✅ Próximos Passos

Depois de publicado:
1. Configure Google Play In-App Updates
2. Adicione Firebase Analytics
3. Configure Google Play Console API para automatizar submissões
4. Crie testes A/B para ícones e screenshots

**Boa sorte com a publicação! 🚀**
