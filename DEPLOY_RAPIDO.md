# 🚀 Deploy Rápido para Google Play

## ✅ Pré-requisitos
- [ ] Conta Google Play Console (US$ 25)
- [ ] Conta Expo (gratuita)

## 📦 Passo 1: Gerar o APK/AAB

### Opção A: Usar script automatizado

```bash
./build-android.sh
```

### Opção B: Comandos manuais

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login no Expo
eas login

# Gerar AAB para Google Play
eas build --platform android --profile production

# OU Gerar APK para teste
eas build --platform android --profile production-apk
```

## 📱 Passo 2: Google Play Console

1. Acesse: https://play.google.com/console
2. Clique em **"Criar app"**
3. Preencha:
   - Nome: **Zapi10**
   - Idioma: Português (Brasil)
   - Categoria: **Negócios**

## 📝 Passo 3: Ficha da Loja

### Descrição Curta (80 chars):
```
Gerenciamento de entregas para motoboys. Aceite corridas e otimize rotas.
```

### Screenshots:
- Tire 2-4 capturas de tela do app
- Formato: PNG/JPG
- Tamanho: 1080x1920 recomendado

### Ícone:
- Use: `assets/icon.png` (já está 512x512)

### Feature Graphic:
- Criar imagem 1024x500 com logo e nome do app

## 📤 Passo 4: Upload do AAB

1. Menu: **Produção** → **Versões**
2. **Criar nova versão**
3. Upload do arquivo `.aab`
4. Preencher notas da versão:
```
Versão inicial:
• Gerenciamento de entregas
• Notificações em tempo real
• GPS tracking
• Interface intuitiva
```

## ✅ Passo 5: Publicar

1. Clique em **"Revisar versão"**
2. Corrigir erros/avisos
3. **"Iniciar lançamento para produção"**

⏱️ Tempo de revisão: 1-3 dias

## 📚 Documentação Completa

Ver: `GOOGLE_PLAY_DEPLOY.md`

---

**Informações do App:**
- Package: `com.mvt.mobile.zapi10`
- Versão: 1.0.0
- Version Code: 1
