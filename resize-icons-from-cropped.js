const sharp = require('sharp');
const fs = require('fs');

async function resizeIcons() {
  try {
    console.log('🎨 Redimensionando ícones a partir de new_icon_cropped.png...\n');

    const basePath = 'assets/new_icon_cropped.png';
    
    if (!fs.existsSync(basePath)) {
      console.error('❌ Arquivo new_icon_cropped.png não encontrado!');
      process.exit(1);
    }

    // 1. Icon principal (1024x1024) - Android e iOS
    console.log('📱 Criando icon.png (1024x1024)...');
    await sharp(basePath)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({ quality: 100 })
      .toFile('assets/icon.png');
    console.log('✅ icon.png criado!');

    // 2. Adaptive Icon (1024x1024) - Android
    console.log('🤖 Criando adaptive-icon.png (1024x1024)...');
    await sharp(basePath)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({ quality: 100 })
      .toFile('assets/adaptive-icon.png');
    console.log('✅ adaptive-icon.png criado!');

    // 3. Splash Icon (1200x1200) - Tela de abertura
    console.log('💦 Criando splash-icon.png (1200x1200)...');
    await sharp(basePath)
      .resize(1200, 1200, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({ quality: 100 })
      .toFile('assets/splash-icon.png');
    console.log('✅ splash-icon.png criado!');

    // 4. Favicon (48x48) - Web
    console.log('🌐 Criando favicon.png (48x48)...');
    await sharp(basePath)
      .resize(48, 48, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({ quality: 100 })
      .toFile('assets/favicon.png');
    console.log('✅ favicon.png criado!');

    console.log('\n✨ Todos os ícones foram gerados a partir de new_icon_cropped.png!');
    console.log('📦 Arquivos criados:');
    console.log('   - icon.png (1024x1024) - Ícone principal');
    console.log('   - adaptive-icon.png (1024x1024) - Android adaptive');
    console.log('   - splash-icon.png (1200x1200) - Splash screen');
    console.log('   - favicon.png (48x48) - Web favicon');
    console.log('\n🎯 Identidade visual unificada aplicada!');

  } catch (error) {
    console.error('❌ Erro ao redimensionar ícones:', error);
    process.exit(1);
  }
}

resizeIcons();
