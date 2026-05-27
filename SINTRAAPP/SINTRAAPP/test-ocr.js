/**
 * Script de prueba para el endpoint POST /api/procesar-factura.
 * Requiere Node.js 18+ (usa fetch, FormData y Blob nativos).
 * Uso: node test-ocr.js
 *      node test-ocr.js otra-imagen.jpg
 */

const { readFileSync, existsSync } = require('fs');
const { join, extname, basename } = require('path');

const BACKEND_URL = 'http://localhost:3000/api/procesar-factura';

// Acepta un nombre de archivo como argumento, o usa 'factura.png' por defecto
const nombreArchivo = process.argv[2] || 'factura.png';
const rutaImagen = join(__dirname, nombreArchivo);

const MIME_TYPES = {
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.tiff': 'image/tiff',
  '.tif':  'image/tiff',
};

async function testOCR() {
  if (!existsSync(rutaImagen)) {
    console.error(`\n Archivo no encontrado: ${rutaImagen}`);
    console.error(`   Pon una imagen en la carpeta del proyecto y vuelve a intentar.\n`);
    process.exit(1);
  }

  const ext      = extname(nombreArchivo).toLowerCase();
  const mimeType = MIME_TYPES[ext] ?? 'image/png';

  console.log('--------------------------------------------------');
  console.log('  SintraApp - Test de OCR');
  console.log('--------------------------------------------------');
  console.log(`  Archivo : ${basename(rutaImagen)}`);
  console.log(`  MIME    : ${mimeType}`);
  console.log(`  Destino : ${BACKEND_URL}`);
  console.log('--------------------------------------------------');
  console.log('\nEnviando imagen al backend...\n');

  const buffer = readFileSync(rutaImagen);
  const blob   = new Blob([buffer], { type: mimeType });

  const form = new FormData();
  form.append('imagen', blob, basename(rutaImagen));

  let respuesta;
  try {
    respuesta = await fetch(BACKEND_URL, { method: 'POST', body: form });
  } catch {
    console.error('Error: No se pudo conectar al backend.');
    console.error('Asegurate de que el servidor este corriendo: npm run dev\n');
    process.exit(1);
  }

  const json = await respuesta.json();

  if (!json.exito) {
    console.error('El backend devolvio un error:');
    console.error('  Mensaje:', json.mensaje);
    if (json.detalle) console.error('  Detalle:', json.detalle);
    console.log();
    process.exit(1);
  }

  const { camposSugeridos, confianzaOCR, textoCompleto } = json;
  const detectados = Object.values(camposSugeridos).filter(Boolean).length;

  console.log(`OCR completado. Confianza: ${confianzaOCR}%\n`);

  console.log(`--- Campos sugeridos (${detectados}/3 detectados) ---`);
  console.log('  Placa        :', camposSugeridos.placa         ?? '(no detectada)');
  console.log('  Valor Total  :', camposSugeridos.valorTotal     ?? '(no detectado)');
  console.log('  Nro. Factura :', camposSugeridos.numeroFactura  ?? '(no detectado)');

  console.log('\n--- Texto completo extraido ---');
  textoCompleto.trim().split('\n').forEach((linea) => console.log('  ' + linea));
  console.log('--------------------------------------------------\n');
}

testOCR();
