const sharp = require('sharp');

async function createSplashScreen() {
  try {
    console.log('🎨 Criando splash screen customizada...\n');

    const width = 1284;
    const height = 2778;
    
    // Criar SVG com degradê elegante
    const splashSvg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Degradê radial do centro para as bordas -->
          <radialGradient id="bgGradient" cx="50%" cy="45%" r="60%">
            <stop offset="0%" style="stop-color:#1a1a3e;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#0f0f23;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#050510;stop-opacity:1" />
          </radialGradient>
          
          <!-- Sombra suave para o ícone -->
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="8"/>
            <feOffset dx="0" dy="4" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Fundo com degradê -->
        <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
        
        <!-- Círculo sutil atrás do ícone -->
        <circle cx="${width/2}" cy="${height/2}" r="200" fill="#1a1a3e" opacity="0.3"/>
      </svg>
    `;

    // Carregar o ícone - tamanho maior e com melhor qualidade
    const iconBuffer = await sharp('assets/new_icon_cropped.png')
      .resize(320, 320, { 
        fit: 'contain', 
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3 // Melhor qualidade de redimensionamento
      })
      .toBuffer();

    // Criar a splash screen com ícone centralizado
    await sharp(Buffer.from(splashSvg))
      .composite([
        {
          input: iconBuffer,
          top: Math.round(height/2 - 160),
          left: Math.round(width/2 - 160)
        }
      ])
      .png({ quality: 100, compressionLevel: 9 })
      .toFile('assets/splash.png');

    console.log('✅ Splash screen criada com sucesso!');
    console.log('📁 Arquivo: assets/splash.png');
    console.log(`📏 Tamanho: ${width}x${height}px`);
    console.log('🎨 Fundo: Degradê elegante (radial)');
    console.log('🎯 Contém: Ícone centralizado com círculo sutil de fundo');
    console.log('💡 Dica: Feche completamente o app e reabra para ver o novo splash');

  } catch (error) {
    console.error('❌ Erro ao criar splash screen:', error);
    process.exit(1);
  }
}

createSplashScreen();
