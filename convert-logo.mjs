import sharp from 'sharp';
import { statSync } from 'fs';

sharp.limitInputPixels(0);

const input = 'public/LOGO2.png';
const output = 'public/LOGO2.webp';

const result = await sharp(input)
  .webp({ lossless: true })
  .toFile(output);

const pngSize = statSync(input).size;
const webpSize = statSync(output).size;

console.log('✅ Conversion complete!');
console.log(`   Format : ${result.format}`);
console.log(`   Size   : ${result.width}x${result.height}px`);
console.log(`   PNG    : ${(pngSize / 1024).toFixed(1)} KB`);
console.log(`   WebP   : ${(webpSize / 1024).toFixed(1)} KB`);
console.log(`   Saving : ${((1 - webpSize / pngSize) * 100).toFixed(1)}%`);
