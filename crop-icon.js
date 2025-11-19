const sharp = require('sharp');
const fs = require('fs');

async function cropIcon() {
  try {
    console.log('🔍 Analisando new_icon.png...');
    
    const originalMetadata = await sharp('assets/new_icon.png').metadata();
    console.log(`📏 Tamanho original: ${originalMetadata.width}x${originalMetadata.height}px`);
    
    // Faz trim automático (remove margens vazias)
    const croppedBuffer = await sharp('assets/new_icon.png')
      .trim({
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // Remove fundo transparente
        threshold: 10 // Tolerância para detectar bordas
      })
      .toBuffer();
    
    const metadata = await sharp(croppedBuffer).metadata();
    console.log(`✂️  Após crop: ${metadata.width}x${metadata.height}px`);
    
    // Adiciona um pequeno padding de segurança (5% em cada lado)
    const padding = Math.round(Math.max(metadata.width, metadata.height) * 0.05);
    console.log(`📐 Adicionando padding de segurança: ${padding}px`);
    
    await sharp(croppedBuffer)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile('assets/new_icon_cropped.png');
    
    const finalMetadata = await sharp('assets/new_icon_cropped.png').metadata();
    console.log(`✅ Dimensões finais: ${finalMetadata.width}x${finalMetadata.height}px`);
    
    // Calcular economia de espaço
    const originalSize = originalMetadata.width * originalMetadata.height;
    const finalSize = finalMetadata.width * finalMetadata.height;
    const saved = ((1 - finalSize / originalSize) * 100).toFixed(1);
    
    console.log('\n🎉 Crop concluído com sucesso!');
    console.log(`💾 Economia de espaço: ${saved}% (removeu margens vazias)`);
    console.log('📁 Arquivo criado: assets/new_icon_cropped.png');
    console.log('\n✨ Próximos passos:');
    console.log('   1. Verifique o arquivo new_icon_cropped.png');
    console.log('   2. Se estiver bom, substitua o ícone principal:');
    console.log('      cp assets/new_icon_cropped.png assets/icon.png');
    
  } catch (error) {
    console.error('❌ Erro ao processar imagem:', error.message);
  }
}

cropIcon();
