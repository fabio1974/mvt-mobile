#!/bin/bash

# Build de PRODUÇÃO local para testar antes do Google Play
# Este build é IDÊNTICO ao que vai para produção

echo "🏗️  Criando build de PRODUÇÃO local..."
echo ""
echo "⚠️  Este build usa:"
echo "   - Release mode"
echo "   - ProGuard/R8 ativo"
echo "   - Minificação de código"
echo "   - Otimizações de produção"
echo ""

# Limpa builds anteriores
echo "🧹 Limpando builds anteriores..."
cd android
./gradlew clean

# Cria APK de release
echo ""
echo "📦 Gerando APK de produção..."
./gradlew assembleRelease

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build de PRODUÇÃO criado com sucesso!"
    echo ""
    echo "📍 Localização do APK:"
    echo "   android/app/build/outputs/apk/release/app-release.apk"
    echo ""
    echo "📱 Como instalar:"
    echo "   1. Conecte o device via USB"
    echo "   2. Execute: adb install android/app/build/outputs/apk/release/app-release.apk"
    echo "   3. Ou compartilhe o APK via WhatsApp/Email"
    echo ""
    echo "🧪 Teste FCM:"
    echo "   ./test-fcm.sh \"FCM_TOKEN\" \"SERVER_KEY\""
    echo ""
    echo "⚠️  IMPORTANTE:"
    echo "   Este APK NÃO está assinado com keystore de produção."
    echo "   Para build 100% idêntico ao Google Play, use EAS Build."
else
    echo ""
    echo "❌ Erro ao criar build!"
    exit 1
fi
