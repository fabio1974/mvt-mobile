#!/usr/bin/env bash

# Hook executado antes do build do EAS
# Aumenta memória do Gradle para evitar falhas de build

set -e

echo "🔧 Configurando memória do Gradle..."

GRADLE_PROPERTIES="$EAS_BUILD_WORKINGDIR/android/gradle.properties"

if [ -f "$GRADLE_PROPERTIES" ]; then
  # Aumenta heap do Gradle para 4GB e MetaspaceSize para 1GB
  sed -i 's/org.gradle.jvmargs=.*/org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m/g' "$GRADLE_PROPERTIES"
  
  # Adiciona otimizações de build se ainda não existirem
  if ! grep -q "org.gradle.caching" "$GRADLE_PROPERTIES"; then
    echo "" >> "$GRADLE_PROPERTIES"
    echo "# Otimizações de build (adicionadas pelo EAS hook)" >> "$GRADLE_PROPERTIES"
    echo "org.gradle.caching=true" >> "$GRADLE_PROPERTIES"
    echo "org.gradle.configureondemand=true" >> "$GRADLE_PROPERTIES"
  fi
  
  echo "✅ Gradle configurado com 4GB de heap"
  echo "📄 Conteúdo do gradle.properties:"
  grep "org.gradle" "$GRADLE_PROPERTIES"
else
  echo "⚠️ Arquivo gradle.properties não encontrado"
fi
