const sharp = require('sharp');

async function thickenBorder() {
  try {
    console.log('🔍 Carregando new_icon_cropped.png...');
    
    const image = sharp('assets/new_icon_cropped.png');
    const metadata = await image.metadata();
    console.log(`📐 Dimensões atuais: ${metadata.width}x${metadata.height}px`);
    
    // Aumentar a borda em 50% significa reduzir o conteúdo interno
    // e adicionar mais espaço ao redor
    const scaleFactor = 0.85; // Reduz conteúdo interno para 85% (deixa 15% para borda mais grossa)
    const newInnerSize = Math.round(Math.min(metadata.width, metadata.height) * scaleFactor);
    
    console.log(`🔄 Redimensionando conteúdo interno para: ${newInnerSize}x${newInnerSize}px`);
    console.log(`📏 Borda ficará ~50% mais grossa`);
    
    // Primeiro redimensiona o conteúdo mantendo proporções
    const resizedBuffer = await image
      .resize(newInnerSize, newInnerSize, {
        fit: 'inside',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();
    
    // Calcula padding para centralizar
    const padding = Math.round((metadata.width - newInnerSize) / 2);
    console.log(`📐 Padding aplicado: ${padding}px em cada lado`);
    
    // Adiciona padding para voltar ao tamanho original (borda mais grossa)
    await sharp(resizedBuffer)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile('assets/new_icon_thick_border.png');
    
    const finalMetadata = await sharp('assets/new_icon_thick_border.png').metadata();
    console.log(`✅ Dimensões finais: ${finalMetadata.width}x${finalMetadata.height}px`);
    
    console.log('\n🎉 Borda aumentada em 50% com sucesso!');
    console.log('📁 Arquivo criado: assets/new_icon_thick_border.png');
    console.log('\n💡 Se gostar do resultado, renomeie:');
    console.log('   cp assets/new_icon_thick_border.png assets/new_icon_cropped.png');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

thickenBorder();
