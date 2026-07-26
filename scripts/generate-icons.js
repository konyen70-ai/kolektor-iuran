import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Create high resolution SVG for Kolektor Iuran RT 05 icon
function generateSVG(size, paddingRatio = 0) {
  const pad = size * paddingRatio;
  const innerSize = size - (pad * 2);
  
  // Icon design:
  // Background: Rounded rect with gradient (indigo to deep slate blue)
  // Center emblem: QR code / Card + Rupee/Rupiah coin + RT Badge symbol
  const rx = innerSize * 0.22;
  
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="50%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#030712"/>
      </linearGradient>
      
      <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#3b82f6"/>
        <stop offset="100%" stop-color="#1d4ed8"/>
      </linearGradient>

      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fbbf24"/>
        <stop offset="100%" stop-color="#d97706"/>
      </linearGradient>

      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="100%" stop-color="#2563eb"/>
      </linearGradient>

      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#3b82f6" flood-opacity="0.3"/>
      </filter>
    </defs>

    <!-- Canvas Background -->
    <rect width="${size}" height="${size}" fill="#0f172a" />

    <!-- Icon Card Container -->
    <g transform="translate(${pad}, ${pad})">
      <!-- Main Card Outer -->
      <rect x="0" y="0" width="${innerSize}" height="${innerSize}" rx="${rx}" fill="url(#bgGrad)" stroke="#334155" stroke-width="${innerSize * 0.02}" />

      <!-- Glowing Accent Circle top right -->
      <circle cx="${innerSize * 0.85}" cy="${innerSize * 0.15}" r="${innerSize * 0.25}" fill="url(#accentGrad)" opacity="0.15" />

      <!-- Inner Blue Rounded Box -->
      <rect x="${innerSize * 0.12}" y="${innerSize * 0.12}" width="${innerSize * 0.76}" height="${innerSize * 0.76}" rx="${rx * 0.8}" fill="url(#badgeGrad)" filter="url(#glow)" />

      <!-- QR Code Corners Graphic (Representation of RT Card Scan) -->
      <!-- Top-Left QR Corner -->
      <rect x="${innerSize * 0.22}" y="${innerSize * 0.22}" width="${innerSize * 0.20}" height="${innerSize * 0.20}" rx="${innerSize * 0.04}" fill="#ffffff" />
      <rect x="${innerSize * 0.26}" y="${innerSize * 0.26}" width="${innerSize * 0.12}" height="${innerSize * 0.12}" rx="${innerSize * 0.02}" fill="#1d4ed8" />

      <!-- Top-Right QR Corner -->
      <rect x="${innerSize * 0.58}" y="${innerSize * 0.22}" width="${innerSize * 0.20}" height="${innerSize * 0.20}" rx="${innerSize * 0.04}" fill="#ffffff" />
      <rect x="${innerSize * 0.62}" y="${innerSize * 0.26}" width="${innerSize * 0.12}" height="${innerSize * 0.12}" rx="${innerSize * 0.02}" fill="#1d4ed8" />

      <!-- Bottom-Left QR Corner -->
      <rect x="${innerSize * 0.22}" y="${innerSize * 0.58}" width="${innerSize * 0.20}" height="${innerSize * 0.20}" rx="${innerSize * 0.04}" fill="#ffffff" />
      <rect x="${innerSize * 0.26}" y="${innerSize * 0.62}" width="${innerSize * 0.12}" height="${innerSize * 0.12}" rx="${innerSize * 0.02}" fill="#1d4ed8" />

      <!-- Center Gold Coin / Rp Emblem -->
      <circle cx="${innerSize * 0.68}" cy="${innerSize * 0.68}" r="${innerSize * 0.16}" fill="url(#goldGrad)" stroke="#ffffff" stroke-width="${innerSize * 0.025}" />
      <text x="${innerSize * 0.68}" y="${innerSize * 0.73}" font-family="Arial, sans-serif" font-weight="900" font-size="${innerSize * 0.15}" fill="#ffffff" text-anchor="middle">Rp</text>

      <!-- Center Text "RT05" -->
      <text x="${innerSize * 0.42}" y="${innerSize * 0.52}" font-family="Arial, sans-serif" font-weight="900" font-size="${innerSize * 0.13}" fill="#ffffff" text-anchor="middle">RT05</text>
    </g>
  </svg>
  `;
}

async function generateIcons() {
  const publicDir = path.join(process.cwd(), 'public');

  // 1. Standard 512x512
  const svg512 = generateSVG(512, 0);
  await sharp(Buffer.from(svg512)).png().toFile(path.join(publicDir, 'icon-512.png'));

  // 2. Standard 192x192
  const svg192 = generateSVG(192, 0);
  await sharp(Buffer.from(svg192)).png().toFile(path.join(publicDir, 'icon-192.png'));

  // 3. Maskable 512x512 (with 18% safe padding for Android adaptive mask shapes)
  const svgMaskable = generateSVG(512, 0.15);
  await sharp(Buffer.from(svgMaskable)).png().toFile(path.join(publicDir, 'icon-maskable.png'));

  // 4. Apple Touch Icon 180x180
  const svgApple = generateSVG(180, 0);
  await sharp(Buffer.from(svgApple)).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 5. Favicon 32x32
  const svgFavicon = generateSVG(64, 0);
  await sharp(Buffer.from(svgFavicon)).resize(32, 32).png().toFile(path.join(publicDir, 'icon.png'));

  console.log('All PWA icons successfully generated!');
}

generateIcons().catch(console.error);
