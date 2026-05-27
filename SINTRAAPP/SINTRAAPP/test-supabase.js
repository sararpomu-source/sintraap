require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function testJsonInsert() {
  console.log('Testing insert with id_mensajero=null and messenger in tipo_tramite JSON...');
  const record = {
    id_mensajero: null, // Evita la constraint de clave foránea
    organismo_transito: 'Secretaría de Movilidad de Medellín',
    numero_factura: 'REC-' + Math.floor(Math.random() * 100000),
    fecha_factura: '2026-05-19',
    placa: 'MNO456',
    tipo_tramite: JSON.stringify({ 
      confianzaOCR: 85, 
      textoCompleto: 'TEST TEXT',
      mensajero: 'Alejandro',
      id_mensajero: '11111111-1111-1111-1111-111111111111'
    }),
    valor_total: 150000,
    url_foto: 'data:image/png;base64,mockdata',
    estado_validacion: 'Pendiente' // Satisface la restricción check_constraint de la BD
  };

  const { data, error } = await supabase
    .from('facturas_ocr')
    .insert([record])
    .select();

  if (error) {
    console.error('Insert FAILED:', error.message);
  } else {
    console.log('Insert SUCCESS. Record ID:', data[0].id);
    const parsed = JSON.parse(data[0].tipo_tramite);
    console.log('Extracted messenger:', parsed.mensajero);
    console.log('Extracted messenger ID:', parsed.id_mensajero);
    // Cleanup
    await supabase.from('facturas_ocr').delete().eq('id', data[0].id);
    console.log('Cleanup completed.');
  }
}

testJsonInsert();
