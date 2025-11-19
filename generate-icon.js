/**
 * Script para gerar ícone básico do Zapi10
 * Cria um ícone SVG que pode ser convertido para PNG
 */

const fs = require('fs');
const path = require('path');

// Configurações do ícone
const config = {
  size: 1024,
  backgroundColor: '#4CAF50', // Verde
  textColor: '#FFFFFF',
  text: 'Z10',
  fontSize: 420,
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'bold'
};

// Gerar SVG
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${config.size}" height="${config.size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Fundo com gradiente -->
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4CAF50;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#45a049;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Fundo com bordas arredondadas -->
  <rect width="${config.size}" height="${config.size}" rx="180" fill="url(#grad1)"/>
  
  <!-- Texto principal -->
  <text 
    x="50%" 
    y="50%" 
    font-family="${config.fontFamily}" 
    font-size="${config.fontSize}" 
    font-weight="${config.fontWeight}" 
    fill="${config.textColor}" 
    text-anchor="middle" 
    dominant-baseline="middle"
    filter="url(#shadow)">
    ${config.text}
  </text>
  
  <!-- Subtítulo -->
  <text 
    x="50%" 
    y="78%" 
    font-family="${config.fontFamily}" 
    font-size="120" 
    font-weight="normal" 
    fill="${config.textColor}" 
    text-anchor="middle" 
    opacity="0.9">
    Zapi
  </text>
</svg>`;

// Salvar SVG
const assetsDir = path.join(__dirname, 'assets');
const svgPath = path.join(assetsDir, 'icon-generated.svg');

fs.writeFileSync(svgPath, svg);
console.log('✅ Ícone SVG gerado:', svgPath);

// Instruções
console.log('\n📋 Próximos passos:');
console.log('1. Converta o SVG para PNG 1024x1024px online:');
console.log('   https://cloudconvert.com/svg-to-png');
console.log('   https://svgtopng.com/');
console.log('\n2. Renomeie para icon.png e substitua em assets/');
console.log('\n3. Gere o adaptive-icon.png (com transparência) se necessário');
console.log('\nOu use o comando abaixo para gerar com sharp:');
console.log('npm install sharp && node convert-icon.js');
