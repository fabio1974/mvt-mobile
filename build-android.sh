#!/bin/bash

# 🚀 Script de Build para Google Play
# Autor: Zapi10 Team
# Data: $(date +%Y-%m-%d)

set -e  # Para o script se houver erro

echo "🚀 ============================================"
echo "   ZAPI10 - BUILD PARA GOOGLE PLAY"
echo "============================================"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função de verificação
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 não está instalado${NC}"
        echo "   Instale com: npm install -g $1"
        exit 1
    else
        echo -e "${GREEN}✅ $1 instalado${NC}"
    fi
}

# Verificar pré-requisitos
echo "📋 Verificando pré-requisitos..."
check_command "node"
check_command "npm"
check_command "eas"
echo ""

# Verificar login no EAS
echo "🔐 Verificando autenticação no EAS..."
if ! eas whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Não está logado no EAS${NC}"
    echo "   Executando: eas login"
    eas login
else
    echo -e "${GREEN}✅ Autenticado no EAS${NC}"
    eas whoami
fi
echo ""

# Limpar e instalar dependências
echo "🧹 Limpando node_modules e cache..."
rm -rf node_modules
npm install
echo ""

# Verificar/Corrigir versões dos pacotes Expo
echo "🔧 Verificando versões dos pacotes Expo..."
npx expo install --fix
echo ""

# Menu de opções
echo "📦 Escolha o tipo de build:"
echo "   1) Production AAB (para Google Play)"
echo "   2) Production APK (para instalar localmente)"
echo "   3) Preview APK (teste rápido)"
echo ""
read -p "Digite o número da opção [1]: " BUILD_OPTION
BUILD_OPTION=${BUILD_OPTION:-1}

case $BUILD_OPTION in
    1)
        PROFILE="production"
        echo -e "${GREEN}📦 Gerando Android App Bundle (AAB) para Google Play...${NC}"
        ;;
    2)
        PROFILE="production-apk"
        echo -e "${GREEN}📦 Gerando APK de produção...${NC}"
        ;;
    3)
        PROFILE="preview"
        echo -e "${GREEN}📦 Gerando APK de preview...${NC}"
        ;;
    *)
        echo -e "${RED}❌ Opção inválida${NC}"
        exit 1
        ;;
esac
echo ""

# Executar build
echo "🚀 Iniciando build com profile: $PROFILE"
echo "   Isso pode levar 10-20 minutos..."
echo ""
eas build --platform android --profile $PROFILE

# Sucesso
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✅ BUILD CONCLUÍDO COM SUCESSO!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "📥 Para baixar o arquivo gerado:"
echo "   eas build:download --platform android"
echo ""
echo "📱 Próximos passos:"
if [ "$PROFILE" = "production" ]; then
    echo "   1. Acesse: https://play.google.com/console"
    echo "   2. Vá em: Produção → Versões"
    echo "   3. Faça upload do arquivo .aab"
    echo "   4. Preencha as notas da versão"
    echo "   5. Clique em 'Revisar versão'"
    echo ""
    echo "📚 Guia completo: GOOGLE_PLAY_DEPLOY.md"
else
    echo "   1. Baixe o APK gerado"
    echo "   2. Instale no dispositivo Android"
    echo "   3. Teste todas as funcionalidades"
fi
echo ""
