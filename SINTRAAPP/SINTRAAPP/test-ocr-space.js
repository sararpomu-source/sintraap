const fs = require('fs');
async function test() {
  const apiKey = 'K86908507788957';
  
  // Create a dummy image buffer (or read from disk)
  let buffer;
  let mimetype = 'image/png';
  let originalname = 'test.png';
  try {
    buffer = fs.readFileSync('factura.png');
  } catch (e) {
    buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  }

  const formData = new FormData();
  // Using Blob
  const blob = new Blob([buffer], { type: mimetype });
  formData.append('file', blob, originalname);
  formData.append('language', 'spa');

  try {
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': apiKey
      },
      body: formData
    });
    
    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", text);
  } catch(e) {
    console.error("Fetch error:", e);
  }
}
test();
