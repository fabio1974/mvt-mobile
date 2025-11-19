/**
 * Converte o SVG gerado para PNG
 * Requer: npm install sharp
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertIcon() {
  const svgPath = path.join(__dirname, 'assets', 'icon-generated.svg');
  const pngPath = path.join(__dirname, 'assets', 'icon.png');
  const adaptivePath = path.join(__dirname, 'assets', 'adaptive-icon.png');

  try {
    // Ler SVG
    const svgBuffer = fs.readFileSync(svgPath);

    // Converter para PNG 1024x1024
    await sharp(svgBuffer)
      .resize(1024, 1024)
      .png()
      .toFile(pngPath);
    
    console.log('✅ icon.png criado:', pngPath);

    // Criar adaptive icon (mesmo conteúdo)
    await sharp(svgBuffer)
      .resize(1024, 1024)
      .png()
      .toFile(adaptivePath);
    
    console.log('✅ adaptive-icon.png criado:', adaptivePath);

    // Criar favicon 48x48
    const faviconPath = path.join(__dirname, 'assets', 'favicon.png');
    await sharp(svgBuffer)
      .resize(48, 48)
      .png()
      .toFile(faviconPath);
    
    console.log('✅ favicon.png criado:', faviconPath);

    console.log('\n🎉 Todos os ícones foram gerados com sucesso!');
    console.log('\n📱 Próximo passo: Execute a build novamente');
    console.log('eas build --platform android --profile production');

  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ Erro: sharp não está instalado');
      console.log('\n📦 Instale com: npm install sharp');
      console.log('\nOu converta manualmente online:');
      console.log('https://cloudconvert.com/svg-to-png');
    } else {
      console.error('❌ Erro ao converter ícone:', error.message);
    }
  }
}

convertIcon();
