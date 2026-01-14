#!/bin/bash

# Script para gerar AAB de produção com nome padronizado
# Uso: ./build-release.sh

set -e

cd "$(dirname "$0")"

# Configurar Java 17
export JAVA_HOME=/Library/Java/JavaVirtualMachines/amazon-corretto-17.jdk/Contents/Home

# Ler versionCode e versionName do build.gradle
VERSION_CODE=$(grep "versionCode" android/app/build.gradle | head -1 | sed 's/[^0-9]*//g')
VERSION_NAME=$(grep "versionName" android/app/build.gradle | head -1 | sed 's/.*"\(.*\)".*/\1/')

echo "🔧 Gerando build..."
echo "   Versão: $VERSION_NAME ($VERSION_CODE)"

# Gerar AAB
cd android
./gradlew bundleRelease

# Renomear AAB
cd app/build/outputs/bundle/release

# Remover arquivos antigos com padrão zapi10-*
rm -f zapi10-*.aab

# Renomear novo arquivo
NEW_NAME="zapi10-${VERSION_NAME}-${VERSION_CODE}.aab"
mv app-release.aab "$NEW_NAME"

echo ""
echo "✅ Build concluído!"
echo "📦 Arquivo: $(pwd)/$NEW_NAME"
echo ""
echo "📤 Faça upload no Google Play Console:"
echo "   https://play.google.com/console"
