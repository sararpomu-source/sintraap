// Prueba directa del endpoint POST /api/guardar-factura
// Uso: node test-guardar.js

const URL = 'http://localhost:3000/api/guardar-factura';

const datosPrueba = {
  organismo_transito: 'Medellín',
  numero_factura:     'TEST-001',
  fecha_factura:      '2026-05-15',
  placa:              'ABC123',
  tipo_tramite:       'Multa',
  valor_total:        185000,
};

async function testGuardar() {
  console.log('Enviando a:', URL);
  console.log('Datos:', JSON.stringify(datosPrueba, null, 2), '\n');

  const resp = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datosPrueba),
  });

  const json = await resp.json();

  console.log('HTTP Status:', resp.status);
  // Muestra la respuesta COMPLETA incluyendo el campo "detalle" con el error de Supabase
  console.log('Respuesta completa:\n', JSON.stringify(json, null, 2));
}

testGuardar().catch((err) => {
  console.error('No se pudo conectar. ¿Está corriendo el backend?', err.message);
});
