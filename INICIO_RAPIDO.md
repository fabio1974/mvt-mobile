# 🚀 Início Rápido - Publicar no Google Play

## 1️⃣ Login no Expo

```bash
eas login
```

## 2️⃣ Configurar Build

```bash
eas build:configure
```

## 3️⃣ Criar Build de Produção (AAB)

```bash
eas build --platform android --profile production
```

> ⏱️ Aguarde ~20 minutos

## 4️⃣ Baixar o AAB

Após a build completar, baixe o arquivo `.aab`:

```bash
eas build:download
```

## 5️⃣ Google Play Console

1. Acesse: https://play.google.com/console
2. Crie uma conta ($25 USD - pagamento único)
3. Crie novo app
4. Upload do AAB em **Testing → Internal testing**
5. Adicione testadores
6. Envie o link de teste para eles

---

## 📖 Guia Completo

Para instruções detalhadas, veja: [PUBLICAR_GOOGLE_PLAY.md](./PUBLICAR_GOOGLE_PLAY.md)

---

## 🎨 Arquivos Necessários

- [x] AAB (gerado pelo EAS)
- [ ] Ícone 512x512px
- [ ] Feature Graphic 1024x500px
- [ ] Screenshots (mínimo 2)
- [ ] Política de Privacidade (URL)

---

## ⚡ Teste Rápido (sem Google Play)

Se quiser testar mais rápido:

```bash
eas build --platform android --profile preview
```

Isso gera um APK que pode ser instalado diretamente no celular.
