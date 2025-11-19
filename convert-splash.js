/**
 * Converte o splash SVG para PNG
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertSplash() {
  const svgPath = path.join(__dirname, 'assets', 'splash-generated.svg');
  const pngPath = path.join(__dirname, 'assets', 'splash-icon.png');

  try {
    const svgBuffer = fs.readFileSync(svgPath);

    // Converter para PNG 1284x2778 (iPhone 14 Pro Max)
    await sharp(svgBuffer)
      .resize(1284, 2778)
      .png()
      .toFile(pngPath);
    
    console.log('✅ splash-icon.png criado:', pngPath);
    console.log('\n🎉 Splash screen gerado com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao converter splash:', error.message);
  }
}

convertSplash();
