const sharp = require('sharp');

async function addThickBorder() {
  try {
    console.log('🎨 Adicionando borda grossa ao balão de chat...\n');
    
    // Carrega a imagem original
    const originalImage = sharp('assets/new_icon_cropped.png');
    const metadata = await originalImage.metadata();
    
    console.log(`📏 Imagem original: ${metadata.width}x${metadata.height}px`);
    
    // Criar SVG do balão de chat com borda MUITO grossa
    const size = Math.max(metadata.width, metadata.height);
    const borderWidth = 40; // Borda bem grossa (antes era ~15px)
    const balloonPadding = 80;
    
    const svgBalloon = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
          <feOffset dx="0" dy="2" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Balão principal com borda grossa -->
      <g filter="url(#shadow)">
        <!-- Fundo branco do balão -->
        <rect x="${balloonPadding}" y="${balloonPadding}" 
              width="${size - balloonPadding * 2}" 
              height="${size - balloonPadding * 2 - 100}" 
              rx="60" ry="60" 
              fill="white"/>
        
        <!-- Borda verde grossa -->
        <rect x="${balloonPadding}" y="${balloonPadding}" 
              width="${size - balloonPadding * 2}" 
              height="${size - balloonPadding * 2 - 100}" 
              rx="60" ry="60" 
              fill="none"
              stroke="#25D366" 
              stroke-width="${borderWidth}"/>
        
        <!-- Ponta do balão (fundo) -->
        <path d="M ${size/2 - 50} ${size - balloonPadding - 100} 
                 L ${size/2} ${size - balloonPadding - 20} 
                 L ${size/2 + 50} ${size - balloonPadding - 100}" 
              fill="white"/>
        
        <!-- Ponta do balão (borda) -->
        <path d="M ${size/2 - 50} ${size - balloonPadding - 100} 
                 L ${size/2} ${size - balloonPadding - 20} 
                 L ${size/2 + 50} ${size - balloonPadding - 100}" 
              fill="none"
              stroke="#25D366" 
              stroke-width="${borderWidth}"
              stroke-linejoin="round"
              stroke-linecap="round"/>
      </g>
    </svg>
    `;
    
    // Redimensionar a imagem original para caber dentro do balão
    const innerSize = size - (balloonPadding * 2) - (borderWidth * 2) - 40;
    const resizedOriginal = await originalImage
      .resize(innerSize, innerSize, {
        fit: 'inside',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();
    
    const resizedMetadata = await sharp(resizedOriginal).metadata();
    console.log(`📐 Imagem redimensionada: ${resizedMetadata.width}x${resizedMetadata.height}px`);
    
    // Centralizar a imagem dentro do balão
    const offsetX = Math.round((size - resizedMetadata.width) / 2);
    const offsetY = Math.round((size - resizedMetadata.height) / 2) - 30; // Ajuste para cima
    
    console.log(`📍 Posicionamento: x=${offsetX}, y=${offsetY}`);
    
    // Compor: balão + imagem original no centro
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([
      {
        input: Buffer.from(svgBalloon),
        top: 0,
        left: 0
      },
      {
        input: resizedOriginal,
        top: offsetY,
        left: offsetX
      }
    ])
    .png()
    .toFile('assets/icon_with_thick_border.png');
    
    console.log('\n✅ Ícone com borda grossa criado!');
    console.log('📁 Arquivo: assets/icon_with_thick_border.png');
    console.log(`📏 Tamanho: ${size}x${size}px`);
    console.log(`🖌️  Espessura da borda: ${borderWidth}px (50% mais grossa!)`);
    console.log('\n💡 Para usar como ícone principal:');
    console.log('   cp assets/icon_with_thick_border.png assets/icon.png');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

addThickBorder();
