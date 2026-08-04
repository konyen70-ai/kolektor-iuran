import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Clean vector design for Kolektor Iuran RT 05
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Outer background rounded rect -->
  <rect width="512" height="512" rx="110" fill="url(#bgGrad)" />

  <!-- Outer Ring / Accent line -->
  <rect x="16" y="16" width="480" height="480" rx="96" fill="none" stroke="#334155" stroke-width="4" opacity="0.6" />

  <!-- House Badge -->
  <g filter="url(#shadow)">
    <path d="M256 96 L400 208 V384 C400 401.673 385.673 416 368 416 H144 C126.327 416 112 401.673 112 384 V208 Z" fill="url(#emeraldGrad)" />
    <path d="M256 80 L420 208 H380 L256 110 L132 208 H92 Z" fill="#34d399" />
  </g>

  <!-- Cash / Coins Emblem in center -->
  <g transform="translate(186, 216)">
    <rect x="0" y="20" width="140" height="96" rx="16" fill="#ffffff" />
    <rect x="0" y="36" width="140" height="20" fill="#0f172a" />
    <circle cx="105" cy="78" r="14" fill="url(#goldGrad)" />
    <circle cx="70" cy="-10" r="42" fill="url(#goldGrad)" filter="url(#shadow)" />
    <circle cx="70" cy="-10" r="32" fill="none" stroke="#fef08a" stroke-width="3" />
    <text x="70" y="2" font-family="Arial, sans-serif" font-weight="900" font-size="34" fill="#78350f" text-anchor="middle">Rp</text>
  </g>

  <!-- RT Banner -->
  <rect x="146" y="348" width="220" height="44" rx="22" fill="#0f172a" stroke="#34d399" stroke-width="3" />
  <text x="256" y="378" font-family="Arial, sans-serif" font-weight="800" font-size="24" fill="#ffffff" text-anchor="middle" letter-spacing="2">RT 05 / RW 02</text>
</svg>
`;

const svgMaskable = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>

  <rect width="512" height="512" fill="url(#bgGrad)" />

  <g transform="translate(256, 256) scale(0.72) translate(-256, -256)">
    <path d="M256 96 L400 208 V384 C400 401.673 385.673 416 368 416 H144 C126.327 416 112 401.673 112 384 V208 Z" fill="url(#emeraldGrad)" />
    <path d="M256 80 L420 208 H380 L256 110 L132 208 H92 Z" fill="#34d399" />
    
    <g transform="translate(186, 216)">
      <rect x="0" y="20" width="140" height="96" rx="16" fill="#ffffff" />
      <rect x="0" y="36" width="140" height="20" fill="#0f172a" />
      <circle cx="105" cy="78" r="14" fill="url(#goldGrad)" />
      <circle cx="70" cy="-10" r="42" fill="url(#goldGrad)" />
      <circle cx="70" cy="-10" r="32" fill="none" stroke="#fef08a" stroke-width="3" />
      <text x="70" y="2" font-family="Arial, sans-serif" font-weight="900" font-size="34" fill="#78350f" text-anchor="middle">Rp</text>
    </g>

    <rect x="146" y="348" width="220" height="44" rx="22" fill="#0f172a" stroke="#34d399" stroke-width="3" />
    <text x="256" y="378" font-family="Arial, sans-serif" font-weight="800" font-size="24" fill="#ffffff" text-anchor="middle" letter-spacing="2">RT 05 / RW 02</text>
  </g>
</svg>
`;

async function generate() {
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const svgBuffer = Buffer.from(svgIcon);
  const maskableBuffer = Buffer.from(svgMaskable);

  // 1. Generate pwa-512x512.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 2. Generate pwa-192x192.png
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 3. Generate pwa-maskable-512x512.png
  await sharp(maskableBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // 4. Generate icon.png (favicon)
  await sharp(svgBuffer)
    .resize(128, 128)
    .png()
    .toFile(path.join(publicDir, 'icon.png'));

  console.log('Icons generated successfully with sharp!');
}

generate().catch(console.error);
