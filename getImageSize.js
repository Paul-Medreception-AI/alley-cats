const fs = require('fs');
const sizeOf = require('image-size');

try {
  const dimensions = sizeOf('./public/assets/images/lockNoBackground.png');
  console.log(`Image dimensions: ${dimensions.width}x${dimensions.height}px`);
} catch (error) {
  console.error('Error getting image dimensions:', error);
}
