#!/bin/bash

# Script para gerar AAB de produção com nome padronizado
# Uso: ./build-release.sh [--no-increment]
#
# Opções:
#   --no-increment  Não incrementar versionCode automaticamente

set -e

cd "$(dirname "$0")"

# Configurar Java 17
export JAVA_HOME=/Library/Java/JavaVirtualMachines/amazon-corretto-17.jdk/Contents/Home

# Verificar se deve incrementar
AUTO_INCREMENT=true
if [ "$1" == "--no-increment" ]; then
    AUTO_INCREMENT=false
fi

# Ler versionCode e versionName do app.json
VERSION_CODE=$(grep '"versionCode"' app.json | sed 's/[^0-9]*//g')
VERSION_NAME=$(grep '"version"' app.json | head -1 | sed 's/.*"\([^"]*\)".*/\1/')

# Auto-incrementar versionCode se não tiver --no-increment
if [ "$AUTO_INCREMENT" == "true" ]; then
    NEW_VERSION_CODE=$((VERSION_CODE + 1))
    echo "🔄 Incrementando versionCode: $VERSION_CODE → $NEW_VERSION_CODE"
    
    # Atualizar app.json
    sed -i '' "s/\"versionCode\": $VERSION_CODE/\"versionCode\": $NEW_VERSION_CODE/" app.json
    VERSION_CODE=$NEW_VERSION_CODE
fi

echo ""
echo "🔧 Gerando build..."
echo "   Versão: $VERSION_NAME (versionCode: $VERSION_CODE)"
echo ""

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
echo ""

# Mostrar se houve mudança no app.json
cd "$(dirname "$0")/.."
if [ "$AUTO_INCREMENT" == "true" ]; then
    echo "💡 Não esqueça de commitar a mudança do versionCode:"
    echo "   git add app.json && git commit -m \"chore: bump versionCode to $VERSION_CODE\""
fi
