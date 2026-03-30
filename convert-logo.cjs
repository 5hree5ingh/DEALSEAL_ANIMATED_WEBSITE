const sharp = require('sharp');
const { statSync } = require('fs');

const input = 'public/LOGO2.png';
const output = 'public/LOGO2.webp';

// sharp 0.33+ uses { limitInputPixels: false } in the constructor
sharp(input, { limitInputPixels: false })
  .webp({ lossless: true })
  .toFile(output)
  .then(function(result) {
    var pngSize = statSync(input).size;
    var webpSize = statSync(output).size;
    console.log('Done!');
    console.log('   Format : ' + result.format);
    console.log('   Size   : ' + result.width + 'x' + result.height + 'px');
    console.log('   PNG    : ' + (pngSize / 1024).toFixed(1) + ' KB');
    console.log('   WebP   : ' + (webpSize / 1024).toFixed(1) + ' KB');
    console.log('   Saving : ' + ((1 - webpSize / pngSize) * 100).toFixed(1) + '%');
  })
  .catch(function(e) {
    console.error('Error:', e.message);
  });
