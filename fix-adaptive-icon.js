/**
 * Script para ajustar o adaptive-icon.png do Android
 * O conteúdo principal deve estar em uma área menor para não ser cortado
 * 
 * Para Android adaptive icons:
 * - Imagem final: 1024x1024
 * - Área segura (safe zone): ~66% = 676x676 centralizado
 * - Conteúdo principal deve ficar dentro da área segura
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ASSETS_DIR = path.join(__dirname, 'assets');
const ICON_SOURCE = path.join(ASSETS_DIR, 'icon.png');
const ADAPTIVE_ICON = path.join(ASSETS_DIR, 'adaptive-icon.png');
const TEMP_RESIZED = path.join(ASSETS_DIR, 'temp-resized.png');

// Tamanho final
const FINAL_SIZE = 1024;

// Tamanho do conteúdo interno (área segura ~66%)
// Use valores menores para "afastar mais" o zoom
const INNER_SIZE = 620; // ~60% da imagem para dar mais margem

console.log('🔧 Ajustando adaptive-icon.png para Android...');
console.log(`📐 Redimensionando conteúdo para ${INNER_SIZE}x${INNER_SIZE} dentro de ${FINAL_SIZE}x${FINAL_SIZE}`);

try {
  // Backup do original
  if (fs.existsSync(ADAPTIVE_ICON)) {
    const backupPath = path.join(ASSETS_DIR, 'adaptive-icon-backup.png');
    fs.copyFileSync(ADAPTIVE_ICON, backupPath);
    console.log('📦 Backup criado: adaptive-icon-backup.png');
  }

  // 1. Redimensiona o ícone original para o tamanho interno
  execSync(`sips -z ${INNER_SIZE} ${INNER_SIZE} "${ICON_SOURCE}" --out "${TEMP_RESIZED}"`);
  console.log(`✅ Ícone redimensionado para ${INNER_SIZE}x${INNER_SIZE}`);

  // 2. Cria uma imagem de fundo com a cor de fundo do app.json
  const backgroundColor = '#0f0f23'; // Cor do app.json
  
  // Usar ImageMagick se disponível, senão usar sips
  try {
    // Tenta com ImageMagick (mais flexível)
    execSync(`convert -size ${FINAL_SIZE}x${FINAL_SIZE} xc:"${backgroundColor}" "${ADAPTIVE_ICON}"`);
    console.log('✅ Fundo criado com ImageMagick');
    
    // Sobrepõe o ícone redimensionado centralizado
    const offset = Math.floor((FINAL_SIZE - INNER_SIZE) / 2);
    execSync(`composite -gravity center "${TEMP_RESIZED}" "${ADAPTIVE_ICON}" "${ADAPTIVE_ICON}"`);
    console.log('✅ Ícone centralizado sobre o fundo');
    
  } catch (e) {
    console.log('⚠️ ImageMagick não disponível, usando método alternativo...');
    
    // Método alternativo usando sips
    // Cria canvas expandindo a imagem com padding
    execSync(`sips -p ${FINAL_SIZE} ${FINAL_SIZE} --padColor 0F0F23 "${TEMP_RESIZED}" --out "${ADAPTIVE_ICON}"`);
    console.log('✅ Ícone com padding aplicado');
  }

  // Limpa arquivo temporário
  if (fs.existsSync(TEMP_RESIZED)) {
    fs.unlinkSync(TEMP_RESIZED);
  }

  console.log('');
  console.log('✅ adaptive-icon.png atualizado com sucesso!');
  console.log('📱 O ícone agora tem mais margem para não ser cortado no Android');
  console.log('');
  console.log('⚠️  Para aplicar a mudança, execute:');
  console.log('    npx expo prebuild --clean');
  console.log('    npx expo run:android');

} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
}
