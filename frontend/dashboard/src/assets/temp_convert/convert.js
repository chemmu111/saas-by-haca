const sharp = require('sharp');

sharp('../cursor.svg')
    .resize(32, 32)
    .png()
    .toFile('../cursor.png')
    .then(info => { console.log('Conversion complete:', info); })
    .catch(err => { console.error('Error:', err); });
