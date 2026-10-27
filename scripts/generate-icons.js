import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generate() {
  const svgPath = path.resolve('public/icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  const targets = [
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'pwa-maskable-512x512.png', size: 512, padding: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon.ico', size: 64 },
  ];

  for (const target of targets) {
    const outPath = path.resolve('public', target.name);
    if (target.padding) {
      const innerSize = target.size - target.padding * 2;
      const innerBuffer = await sharp(svgBuffer).resize(innerSize, innerSize).toBuffer();
      await sharp({
        create: {
          width: target.size,
          height: target.size,
          channels: 4,
          background: '#020617'
        }
      })
      .composite([{ input: innerBuffer, top: target.padding, left: target.padding }])
      .png()
      .toFile(outPath);
    } else {
      await sharp(svgBuffer).resize(target.size, target.size).png().toFile(outPath);
    }
    console.log(`Generated ${target.name}`);
  }
}

generate().catch(console.error);
