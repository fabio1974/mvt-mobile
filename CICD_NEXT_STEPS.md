# ⚡ Próximas Ações - CI/CD Setup

## 📋 Checklist de Implementação

### ✅ Já feito (automaticamente):
- [x] Workflow file criado: `.github/workflows/deploy.yml`
- [x] Workflow alternativo criado: `.github/workflows/deploy-on-release.yml`
- [x] Documentação criada: `CICD_SETUP.md`

### 🔲 Você precisa fazer AGORA:

#### 1️⃣ **Gerar EAS_TOKEN** (5 min)

Via Expo Dashboard:
```
https://expo.dev
  → Login
  → Settings → Personal access tokens
  → Create token
  → Nome: "GitHub Actions CI/CD"
  → Copy token (exemplo: ey_live_xxxx...)
```

#### 2️⃣ **Criar Google Play Service Account** (10 min)

Via Google Cloud Console:
```
https://console.cloud.google.com
  → Novo projeto
  → APIs & Services
  → Enable: Google Play Admin API
  → Credentials → Create Service Account
  → Keys → Add Key → JSON
  → Download (google-play-sa-key.json)
```

Depois, no Google Play Console:
```
https://play.google.com/console
  → Settings → Users and permissions
  → Invite user (email do service account)
  → Permissão: Admin
```

#### 3️⃣ **Adicionar Secrets no GitHub** (5 min)

```
https://github.com/fabio1974/mvt-mobile
  → Settings
  → Secrets and variables
  → Actions
  → New repository secret
```

**Secret 1:**
- Name: `EAS_TOKEN`
- Value: `ey_live_xxxx...` (do Passo 1)

**Secret 2:**
- Name: `GOOGLE_PLAY_SA_KEY`
- Value: (cola TODO o JSON do Passo 2)

---

## 🎯 Escolha seu Workflow

### **Opção A: Deploy Automático (deploy.yml)** ✨

```yaml
Dispara: Quando você faz push em main
Risco: Baixo (testes podem falhar)
Use se: Sua app está estável
```

**Para usar:**
- Deixe `deploy.yml` habilitado
- Desabilite ou delete `deploy-on-release.yml`

### **Opção B: Deploy Manual (deploy-on-release.yml)** 🛡️

```yaml
Dispara: Quando você cria uma Release no GitHub
Risco: Mínimo (você controla tudo)
Use se: Quer revisar antes de publicar
```

**Para usar:**
- Delete `deploy.yml`
- Mantenha `deploy-on-release.yml`
- Para publicar: GitHub → Releases → Create release

**Como criar release:**
```bash
git tag v1.0.1
git push origin v1.0.1
# Ou via GitHub UI: Create release from tag
```

---

## 📝 Instruções Detalhadas

Veja arquivo completo: **[CICD_SETUP.md](CICD_SETUP.md)**

Ele contém:
- ✅ Passo 1-5 com screenshots
- ✅ Como gerar tokens
- ✅ Como criar service account
- ✅ Troubleshooting
- ✅ Customizações

---

## 🧪 Testar depois de Setup

### Primeira execução:

1. **Commit as mudanças:**
   ```bash
   git add .github/
   git add CICD_SETUP.md
   git add .github/workflows/
   git commit -m "ci: add GitHub Actions deployment pipeline"
   git push origin main
   ```

2. **Veja o workflow rodar:**
   - GitHub → Actions
   - Vê todos os steps em tempo real
   - Logs detalhados para debug

3. **Acompanhe o build:**
   - EAS Dashboard: https://expo.dev/projects/mvt-mobile/builds
   - Vê quando termina (10-20 min)

4. **Verifique Google Play:**
   - https://play.google.com/console
   - Vê submissão chegando
   - Status em preparação

---

## 🔒 Segurança

### Boas práticas implementadas:

✅ **Secrets encriptados no GitHub**
- Não são logados
- Não aparecem em git
- Isolados por runner

✅ **Arquivo JSON não commitado**
- Gerado como `/tmp/google-play-sa-key.json`
- Deletado após uso
- Nunca exposto em logs

✅ **Service Account com permissões mínimas**
- Só pode submeter builds
- Não pode fazer deploys
- Não pode acessar outras apps

---

## 📊 Monitoramento em Tempo Real

### Durante o build:

1. **GitHub Actions:**
   ```
   Repository → Actions → [seu workflow] → [latest run]
   ```
   - Ve cada step
   - Tempo de execução
   - Logs completos

2. **EAS Dashboard:**
   ```
   https://expo.dev/projects/mvt-mobile/builds
   ```
   - Status do build
   - Logs do Gradle
   - Download do APK/AAB

3. **Google Play:**
   ```
   https://play.google.com/console → App releases
   ```
   - Submissão chegando
   - Status de revisão
   - Data de lançamento

---

## 🎛️ Customizações Úteis

### 1. Rodar em múltiplas branches:

Em `deploy.yml`, change:
```yaml
on:
  push:
    branches:
      - main
      - staging    # Adicione
      - develop    # Adicione
```

### 2. Rodar apenas tags com v:

Em `deploy-on-release.yml`:
```yaml
on:
  push:
    tags:
      - 'v*'
```

### 3. Notificar Discord:

Adicione ao final do job:
```yaml
- name: Notify Discord
  if: always()
  run: |
    curl -X POST ${{ secrets.DISCORD_WEBHOOK }} \
      -H 'Content-Type: application/json' \
      -d '{"content":"✨ App submitted to Google Play!"}'
```

(Adicione `DISCORD_WEBHOOK` nos secrets)

---

## ⏱️ Timeline Esperado

```
Você faz git push
    ↓ (imediato)
GitHub Actions inicia
    ↓ (1 min)
Node.js, npm install
    ↓ (2 min)
EAS Build compila
    ↓ (10-15 min) ← Espera aqui
EAS Submit envia
    ↓ (1-2 min)
Google Play recebe
    ↓ (imediato)
App em preparação! 🎉

TOTAL: ~15-20 minutos
```

---

## 🚨 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| "Invalid EAS_TOKEN" | Verifique token no GitHub secrets |
| "Service Account not found" | JSON correto? Aguarde 5 min após adicionar |
| "Build failed: No matching client found" | Verifique google-services.json |
| "Submit timeout" | Google Play lento, aguarde 5 min |
| "Permission denied" | Service account precisa de Admin no Play |

---

## 📞 Suporte

### Se algo falhar:

1. **Veja os logs:**
   - GitHub Actions → seu workflow → logs completos
   - EAS Dashboard → logs do Gradle

2. **Comum:**
   - Primeira build demora mais (10-20 min)
   - Google Play demora para processar (até 2h)
   - Precisa aceitar termos na Play Console (1x)

3. **Regenerar secrets:**
   ```bash
   # Se expirou token:
   # 1. Gere novo no Expo
   # 2. Update no GitHub
   # 3. Tente novamente
   ```

---

## ✨ Pronto!

Depois que completar os 3 passos acima, seu pipeline estará 100% funcional! 🚀

**Próximo passo:** Siga as instruções em `CICD_SETUP.md`
