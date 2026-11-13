const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public');
const icons = path.join(dir, 'icons');

async function main() {
  fs.mkdirSync(icons, { recursive: true });

  const webp = await sharp(path.join(dir, 'maker-hero-visual.png'))
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(path.join(dir, 'maker-hero-visual.webp'));
  console.log('webp', webp);

  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#7C3AED"/>
          <stop offset="55%" stop-color="#5B21B6"/>
          <stop offset="100%" stop-color="#4C1D95"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#g)"/>
      <text x="50%" y="56%" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="280" font-weight="700" fill="#F5F3FF">M</text>
    </svg>`,
  );

  await sharp(svg).png().toFile(path.join(icons, 'icon-512.png'));
  await sharp(svg).resize(192, 192).png().toFile(path.join(icons, 'icon-192.png'));
  await sharp(svg).resize(180, 180).png().toFile(path.join(icons, 'apple-touch-icon.png'));
  console.log('icons ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
