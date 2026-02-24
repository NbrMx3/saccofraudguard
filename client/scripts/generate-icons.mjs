import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'public', 'saccoguard.png');
const outDir = path.join(root, 'public');

const sizes = [
  { size: 48, name: 'icon-48x48.png' },
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

// Generate maskable icons (with padding for safe zone)
const maskableSizes = [
  { size: 192, name: 'icon-192x192-maskable.png' },
  { size: 512, name: 'icon-512x512-maskable.png' },
];

async function generateIcons() {
  console.log('Generating PWA icons from saccoguard.png...');

  // Generate standard icons
  for (const { size, name } of sizes) {
    await sharp(source)
      .resize(size, size, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .png()
      .toFile(path.join(outDir, name));
    console.log(`  ✓ ${name}`);
  }

  // Generate maskable icons (with 10% padding for safe zone)
  for (const { size, name } of maskableSizes) {
    const innerSize = Math.round(size * 0.8);
    const padding = Math.round((size - innerSize) / 2);
    
    const resizedLogo = await sharp(source)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 15, g: 23, b: 42, alpha: 255 },
      },
    })
      .composite([{ input: resizedLogo, top: padding, left: padding }])
      .png()
      .toFile(path.join(outDir, name));
    console.log(`  ✓ ${name} (maskable)`);
  }

  // Generate Apple touch icon (180x180)
  await sharp(source)
    .resize(180, 180, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .png()
    .toFile(path.join(outDir, 'apple-touch-icon.png'));
  console.log('  ✓ apple-touch-icon.png');

  // Generate favicon (32x32)
  await sharp(source)
    .resize(32, 32, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .png()
    .toFile(path.join(outDir, 'favicon-32x32.png'));
  console.log('  ✓ favicon-32x32.png');

  // Generate favicon (16x16)
  await sharp(source)
    .resize(16, 16, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .png()
    .toFile(path.join(outDir, 'favicon-16x16.png'));
  console.log('  ✓ favicon-16x16.png');

  console.log('\nDone! All PWA icons generated.');
}

generateIcons().catch(console.error);
