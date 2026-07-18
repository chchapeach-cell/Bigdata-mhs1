import sharp from 'sharp';
import path from 'path';

const svgPath = path.resolve('public/icon.svg');
const out192 = path.resolve('public/icon-192.png');
const out512 = path.resolve('public/icon-512.png');

async function main() {
  try {
    console.log('Generating PWA icons with sharp...');
    
    // Generate 512x512 PNG
    await sharp(svgPath)
      .resize(512, 512)
      .png()
      .toFile(out512);
    console.log('Successfully generated icon-512.png');

    // Generate 192x192 PNG
    await sharp(svgPath)
      .resize(192, 192)
      .png()
      .toFile(out192);
    console.log('Successfully generated icon-192.png');
    
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

main();
