const sharp = require('sharp');

async function createSplashScreen() {
  try {
    console.log('🎨 Criando splash screen customizada...\n');

    const width = 1284;
    const height = 2778;
    
    // Cor de fundo escuro (mesmo do app)
    const backgroundColor = '#0f0f23';
    
    // Criar SVG com logo, nome e tagline
    const splashSvg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <!-- Fundo escuro -->
        <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
        
        <!-- Container centralizado -->
        <g transform="translate(${width/2}, ${height/2 - 50})">
          <!-- Círculo de fundo do logo com sombra -->
          <circle cx="0" cy="-80" r="130" fill="#1a1a2e" opacity="0.8"/>
          <circle cx="0" cy="-80" r="120" fill="none" stroke="#25D366" stroke-width="4"/>
          
          <!-- Texto: ZAPI10 -->
          <text 
            x="0" 
            y="120" 
            font-family="Arial, sans-serif" 
            font-size="88" 
            font-weight="bold" 
            fill="#ffffff" 
            text-anchor="middle"
            letter-spacing="4">
            ZAPI10
          </text>
          
          <!-- Tagline -->
          <text 
            x="0" 
            y="180" 
            font-family="Arial, sans-serif" 
            font-size="28" 
            fill="#94a3b8" 
            text-anchor="middle"
            letter-spacing="2">
            Delivery &amp; Logistics
          </text>
          
          <!-- Versão -->
          <text 
            x="0" 
            y="${height/2 - 100}" 
            font-family="Arial, sans-serif" 
            font-size="20" 
            fill="#64748b" 
            text-anchor="middle">
            Versão 1.0.0
          </text>
        </g>
      </svg>
    `;

    // Carregar o ícone correto (new_icon_cropped.png)
    const iconBuffer = await sharp('assets/new_icon_cropped.png')
      .resize(220, 220, { fit: 'contain' })
      .toBuffer();

    // Criar a splash screen
    await sharp(Buffer.from(splashSvg))
      .composite([
        {
          input: iconBuffer,
          top: Math.round(height/2 - 190),
          left: Math.round(width/2 - 110)
        }
      ])
      .png({ quality: 100 })
      .toFile('assets/splash.png');

    console.log('✅ Splash screen criada com sucesso!');
    console.log('📁 Arquivo: assets/splash.png');
    console.log(`📏 Tamanho: ${width}x${height}px`);
    console.log('🎨 Fundo: Escuro (#0f0f23)');
    console.log('🎯 Contém: Logo + Nome ZAPI10 + Tagline');

  } catch (error) {
    console.error('❌ Erro ao criar splash screen:', error);
    process.exit(1);
  }
}

createSplashScreen();
