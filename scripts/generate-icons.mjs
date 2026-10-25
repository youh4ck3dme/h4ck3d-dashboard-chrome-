// Generates PWA / Apple touch icons from public/favicon.svg.
// Usage: npm run icons
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const pub = (f) => fileURLToPath(new URL(`../public/${f}`, import.meta.url));
const svg = await readFile(pub('favicon.svg'));
const BG = '#0f1010';

// Any-purpose icons keep the rounded square.
for (const size of [192, 512]) {
  await sharp(svg, { density: 512 })
    .resize(size, size)
    .png()
    .toFile(pub(`pwa-${size}x${size}.png`));
}

// Maskable + Apple: full-bleed background, glyph inside the 80% safe zone.
async function padded(size, file, scale) {
  const inner = Math.round(size * scale);
  const glyph = await sharp(svg, { density: 512 }).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: glyph, gravity: 'center' }])
    .png()
    .toFile(pub(file));
}
await padded(512, 'maskable-512x512.png', 0.72);
await padded(180, 'apple-touch-icon.png', 0.86);
await sharp(svg, { density: 512 }).resize(48, 48).png().toFile(pub('favicon-48x48.png'));

console.log('Icons written to public/');
