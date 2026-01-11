#!/usr/bin/env node

/**
 * Script para corrigir conflito de manifesto do Firebase
 * Adiciona tools:replace ao meta-data de notification color
 * Executado automaticamente pelo EAS antes do build
 */

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

if (!fs.existsSync(manifestPath)) {
  console.log('⚠️  AndroidManifest.xml não encontrado, pulando...');
  process.exit(0);
}

let manifest = fs.readFileSync(manifestPath, 'utf8');

// Verifica se já tem o tools:replace
if (manifest.includes('tools:replace="android:resource"')) {
  console.log('✅ tools:replace já presente no manifest');
  process.exit(0);
}

// Adiciona tools:replace ao meta-data do Firebase
const firebaseMetaData = /<meta-data\s+android:name="com\.google\.firebase\.messaging\.default_notification_color"[^>]+>/;

if (manifest.match(firebaseMetaData)) {
  manifest = manifest.replace(
    /<meta-data(\s+android:name="com\.google\.firebase\.messaging\.default_notification_color"[^>]+)\/>/,
    '<meta-data$1tools:replace="android:resource" />'
  );
  
  // Se o meta-data não for self-closing
  manifest = manifest.replace(
    /<meta-data(\s+android:name="com\.google\.firebase\.messaging\.default_notification_color"[^>]+)>/,
    '<meta-data$1tools:replace="android:resource">'
  );
  
  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log('✅ Adicionado tools:replace ao Firebase notification color');
} else {
  console.log('⚠️  Meta-data do Firebase não encontrado no manifest');
}
