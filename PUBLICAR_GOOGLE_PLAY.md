# 📱 Guia Completo: Publicar App no Google Play (Versão de Teste)

## ✅ Pré-requisitos Completados

- [x] App.json configurado com package name: `com.mvt.mobile.zapi10`
- [x] EAS CLI instalado
- [x] Versão: 1.0.0 (versionCode: 1)
- [x] Projeto já está no GitHub: `fabio1974/mvt-mobile`

---

## 🚀 Passo a Passo para Publicação

### 1️⃣ Fazer Login no Expo/EAS

```bash
eas login
```

Digite suas credenciais do Expo (ou crie uma conta em https://expo.dev se não tiver).

---

### 2️⃣ Configurar o Projeto no EAS

```bash
eas build:configure
```

Isso criará o arquivo `eas.json` automaticamente.

---

### 3️⃣ Criar a Build para Android (AAB para Google Play)

```bash
eas build --platform android --profile production
```

**Opções durante o build:**
- Quando perguntar sobre **Keystore**: Escolha "Generate new keystore" (na primeira vez)
- Aguarde a build ser processada nos servidores do Expo (15-30 minutos)

---

### 4️⃣ Baixar o AAB Gerado

Após a build completar, você receberá um link para baixar o arquivo `.aab`. 

Ou baixe via comando:

```bash
eas build:list
```

Copie o ID da build mais recente e baixe:

```bash
eas build:download --id=<BUILD_ID>
```

---

### 5️⃣ Criar Conta no Google Play Console

1. Acesse: https://play.google.com/console
2. Crie uma conta de desenvolvedor (taxa única de $25 USD)
3. Preencha informações da conta

---

### 6️⃣ Criar Novo Aplicativo no Console

1. **Create app**
2. Preencha:
   - **App name**: MVT Mobile (ou nome desejado)
   - **Default language**: Portuguese (Brazil)
   - **App or game**: App
   - **Free or paid**: Free
3. Aceite os termos e crie

---

### 7️⃣ Configurar Conteúdo do App

#### a) **App content** (Conteúdo do app)
- Privacy Policy: URL da política de privacidade
- App access: Descreva se precisa login
- Ads: Se tem anúncios (provavelmente "No")
- Content rating: Questionário sobre o conteúdo

#### b) **Select an app category**
- Category: **Business** ou **Maps & Navigation**

#### c) **Store listing** (Listagem da loja)
- **App name**: MVT Mobile
- **Short description** (80 caracteres):
  ```
  Aplicativo de entrega para motoristas - Gerencie suas entregas facilmente
  ```
- **Full description** (até 4000 caracteres):
  ```
  MVT Mobile é o aplicativo definitivo para motoristas de entrega. 
  
  Recursos principais:
  • 📦 Receba notificações de novas entregas em tempo real
  • 🗺️ Visualize rotas otimizadas com Google Maps
  • 📍 Rastreamento de localização em tempo real
  • ✅ Gerencie status de entregas (aceitar, coletar, entregar)
  • 📊 Histórico completo de entregas
  • 🚚 Interface intuitiva e fácil de usar
  
  Perfeito para motoristas que querem aumentar sua produtividade e eficiência nas entregas!
  ```

- **App icon**: 512x512px (use o arquivo `assets/icon.png` redimensionado)
- **Feature graphic**: 1024x500px (crie um banner promocional)
- **Screenshots**: Pelo menos 2 capturas de tela (recomendado 4-8)
  - Formato: 1080x1920px ou maior
  - Tire screenshots das principais telas do app

---

### 8️⃣ Upload do AAB (Versão de Teste)

1. Vá em **Testing** → **Internal testing**
2. Clique em **Create new release**
3. Upload do arquivo `.aab` baixado
4. Preencha **Release name**: `1.0.0 (1)` - Versão Inicial
5. Preencha **Release notes**:
   ```
   🎉 Primeira versão de teste
   
   Recursos:
   • Sistema de notificações push
   • Gerenciamento de entregas
   • Rastreamento com Google Maps
   • Interface para motoristas
   ```
6. Clique em **Save** e depois **Review release**
7. Confirme e **Start rollout to Internal testing**

---

### 9️⃣ Adicionar Testadores

1. Em **Internal testing** → **Testers**
2. Crie uma lista de testadores
3. Adicione emails dos testadores (podem ser contas Google normais)
4. Copie o **opt-in link** e envie para os testadores
5. Testadores acessam o link, aceitam participar e baixam o app

---

### 🔟 Testar e Iterar

1. **Testadores baixam** o app via Google Play
2. **Coletam feedback** e reportam bugs
3. **Você corrige** e cria nova build:
   ```bash
   # Atualize a versão no app.json:
   # "version": "1.0.1",
   # "versionCode": 2

   eas build --platform android --profile production
   ```
4. **Upload nova versão** no mesmo processo (step 8)

---

## 📋 Checklist Antes da Publicação

- [ ] Atualizar `app.json` com informações corretas:
  - [ ] Nome do app
  - [ ] Descrição
  - [ ] Ícone de alta qualidade (1024x1024px)
  - [ ] Splash screen
- [ ] Remover console.logs desnecessários (opcional para teste)
- [ ] Testar app no modo release localmente
- [ ] Preparar capturas de tela bonitas
- [ ] Escrever descrição atrativa
- [ ] Criar feature graphic profissional
- [ ] Definir política de privacidade (obrigatório)

---

## 🎨 Recursos Gráficos Necessários

### Tamanhos Necessários:

1. **App Icon**: 512x512px (PNG, sem transparência)
2. **Feature Graphic**: 1024x500px (JPG ou PNG)
3. **Screenshots**: 
   - Mínimo 2, recomendado 4-8
   - 1080x1920px (9:16) ou superior
   - Formato: PNG ou JPG
4. **High-res icon** (opcional): 512x512px

---

## 🛠️ Comandos Úteis

### Ver builds anteriores
```bash
eas build:list
```

### Baixar build específica
```bash
eas build:download --id=<BUILD_ID>
```

### Ver credenciais (keystore)
```bash
eas credentials
```

### Build para teste local (APK)
```bash
eas build --platform android --profile preview
```

---

## 🔐 Política de Privacidade

⚠️ **Obrigatório**: Google Play exige uma URL de política de privacidade.

Você pode:
1. Criar uma página simples no seu site
2. Usar GitHub Pages
3. Usar serviços como: https://www.freeprivacypolicy.com/

**Exemplo de conteúdo básico:**
```
Política de Privacidade do MVT Mobile

Coleta de Dados:
- Localização GPS (para rastreamento de entregas)
- Informações de conta (email, nome)
- Notificações push token

Uso dos Dados:
- Gerenciamento de entregas
- Notificações de novas entregas
- Rastreamento de rota

Compartilhamento:
- Não compartilhamos seus dados com terceiros

Contato: seu-email@exemplo.com
```

---

## 📱 Alternativa: Teste mais Rápido com APK

Se quiser testar mais rápido antes do Google Play:

```bash
# Build APK (instala direto no celular)
eas build --platform android --profile preview

# Baixe o APK e instale manualmente
# Ou envie via link para testadores
```

**Vantagem**: Não precisa esperar aprovação do Google Play  
**Desvantagem**: Precisa habilitar "Fontes desconhecidas" no Android

---

## 🎯 Próximos Passos Após Teste Interno

1. **Closed testing** (teste fechado): Mais testadores (até 100)
2. **Open testing** (teste aberto): Qualquer pessoa pode participar
3. **Production** (produção): Publicação oficial na Play Store

---

## 🆘 Troubleshooting

### Erro de Keystore
```bash
eas credentials
```
Escolha "Set up a new Android Keystore"

### Build falha
- Verifique logs em: https://expo.dev/accounts/[seu-usuario]/projects/mvt-mobile/builds
- Erros comuns: dependências nativas, permissões

### AAB muito grande
- Otimize imagens em `assets/`
- Remova dependências não usadas
- Use ProGuard/R8 (já habilitado por padrão)

---

## 📞 Suporte

- **Expo Docs**: https://docs.expo.dev/
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **Google Play Console Help**: https://support.google.com/googleplay/android-developer

---

Bora publicar! 🚀
