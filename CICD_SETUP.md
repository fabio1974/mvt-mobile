# CI/CD Pipeline Setup - Guia Completo

## 🔐 Passo 1: Gerar EAS_TOKEN

### Via Expo Dashboard (Recomendado)

1. Acesse: https://expo.dev
2. Login com sua conta (fb040974)
3. Vá para: Account Settings → Personal access tokens
4. Clique em: "Create a token"
5. Nome: `GitHub Actions CI/CD`
6. Tipo: `Write` (para build + submit)
7. Copie o token gerado (exemplo: `ey_live_abc123...`)
8. **Guarde em local seguro** - não mostra novamente!

```bash
# Formato do token
EAS_TOKEN=ey_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 🎫 Passo 2: Criar Google Play Service Account

### Via Google Cloud Console

1. Acesse: https://console.cloud.google.com
2. Crie novo projeto (ou use existente):
   - Nome: `MVT Mobile CI/CD`
   - Clique "Create"

3. Aguarde projeto ser criado (1-2 min)

4. Habilite Google Play Admin API:
   - Pesquise: "Google Play Admin API"
   - Clique "Enable"
   - Aguarde (1-2 min)

5. Crie Service Account:
   - Menu: APIs & Services → Credentials
   - "Create Credentials" → "Service Account"
   - Preencha:
     - Service account name: `github-actions-deploy`
     - Service account ID: `github-actions-deploy`
   - Clique "Create and Continue"
   - Skip optional steps
   - Clique "Done"

6. Crie chave JSON:
   - Clique no service account criado
   - Aba "Keys"
   - "Add Key" → "Create new key"
   - Formato: JSON
   - Clique "Create"
   - **JSON é baixado automaticamente!**
   - Renomeie para: `google-play-sa-key.json`

### Adicionar Service Account ao Google Play Console

1. Acesse: https://play.google.com/console
2. Vá para: Settings → Users and permissions
3. Clique: "Invite user"
4. Cole o email do service account (encontrado no JSON):
   ```
   "client_email": "github-actions-deploy@XXX.iam.gserviceaccount.com"
   ```
5. Permissões necessárias:
   - ✅ Admin (all permissions)
6. Envie convite

7. **Importante:** Aceite convite no email do service account (se necessário)

---

## 📝 Arquivo JSON Service Account

Após gerar, o arquivo será assim:

```json
{
  "type": "service_account",
  "project_id": "mvt-mobile-cicd",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...",
  "client_email": "github-actions-deploy@mvt-mobile-cicd.iam.gserviceaccount.com",
  "client_id": "1234567890",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/github-actions-deploy%40..."
}
```

---

## 🔐 Passo 3: Adicionar Secrets ao GitHub

### Via GitHub Web

1. Acesse repo: https://github.com/fabio1974/mvt-mobile
2. Settings → Secrets and variables → Actions
3. "New repository secret"

**Secret 1: EAS_TOKEN**
- Name: `EAS_TOKEN`
- Value: `ey_live_XXXXXX...` (cole o token do Passo 1)
- Clique "Add secret"

**Secret 2: GOOGLE_PLAY_SA_KEY**
- Name: `GOOGLE_PLAY_SA_KEY`
- Value: (copie TODO o JSON gerado no Passo 2)
  ```json
  {
    "type": "service_account",
    ...todo o conteúdo...
  }
  ```
- Clique "Add secret"

✅ Ambos aparecerão na lista com ícone 🔒

---

## 📋 Passo 4: Criar Workflow File

O arquivo `.github/workflows/deploy.yml` já será criado automaticamente.

Ele contém:
- Trigger: quando faz push em `main`
- Steps: build com EAS → submit para Google Play
- Usa os secrets automaticamente

---

## 🧪 Passo 5: Testar Pipeline

### Primeira vez (Manual)

1. Commit uma pequena mudança
2. Push para `main`:
   ```bash
   git add .
   git commit -m "test: trigger CI/CD pipeline"
   git push origin main
   ```

3. Vá para: GitHub → Actions
4. Veja o workflow rodando em tempo real
5. Acompanhe os logs

### O que acontece:
- ✅ Checkout do código
- ✅ Setup Node.js
- ✅ npm install
- ✅ EAS Build inicia
  - Compila na nuvem (10-15 min)
- ✅ EAS Submit automático
  - Envia para Google Play (1-2 min)
- ✅ Notificação quando terminar

---

## 📊 Monitoramento

### Ver status do workflow:

1. **GitHub Actions**: Repository → Actions
   - Vê todos os builds
   - Logs detalhados
   - Tempo de execução

2. **EAS Dashboard**: https://expo.dev/projects/mvt-mobile/builds
   - Vê builds específicos
   - Logs do Gradle
   - Download de APK

3. **Google Play Console**: https://play.google.com/console
   - Vê submissões
   - Status de aprovação
   - Versões em produção

---

## 🔧 Customizações Úteis

### 1. Disparar apenas em Releases (mais seguro)

Editar `.github/workflows/deploy.yml`:
```yaml
on:
  release:
    types: [created]  # Só quando você cria release
```

### 2. Disparar em branches específicas

```yaml
on:
  push:
    branches:
      - main
      - staging
```

### 3. Notificar em Discord/Slack

Adicionar step final:
```yaml
- name: Notify Discord
  if: always()
  uses: discordapp/github-actions@v3
  with:
    webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
    message: "App submitted to Google Play!"
```

---

## 🛠️ Troubleshooting

### Build falha com "No matching client found"
- Verifique `google-services.json`
- Verifique bundle ID em `app.json`

### EAS Submit falha com "Invalid service account"
- JSON está correto?
- Service account foi convidado no Google Play?
- Aguarde 5 min após adicionar permissões

### Token expirado
- EAS_TOKEN no GitHub é válido?
- Gere novo token se expirou

### Timeout no build
- EAS demora 10-15 min
- GitHub Actions tem timeout default 360 min (OK)

---

## 📚 Próximas Steps

1. ✅ Gerar EAS_TOKEN
2. ✅ Criar Google Play Service Account
3. ✅ Adicionar secrets no GitHub
4. ✅ Workflow file será criado automaticamente
5. ✅ Fazer push em `main` para testar
6. ✅ Acompanhar GitHub Actions
7. ✅ Verificar submissão no Google Play

---

## 💡 Dicas Importantes

- **Nunca commite credenciais** (tokens, keys)
- GitHub Actions **encripta** os secrets automaticamente
- Secrets só são expostos quando job precisa (protegido)
- Cada runner tem sua própria cópia isolada
- Logs nunca mostram valores dos secrets

---

## 🎯 Resultado Final

Após setup completo:

```
git push main
    ↓
GitHub Actions detecta push
    ↓ (automático)
EAS Build (10-15 min)
    ↓ (automático)
EAS Submit (1-2 min)
    ↓ (automático)
Google Play recebe
    ↓
App em preparação! 🎉
```

Sem fazer nada manual! ✨
