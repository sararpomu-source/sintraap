const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const upload = require('../middleware/upload');
const { parsearFactura } = require('../utils/parser');

// Cliente de Supabase inicializado una sola vez
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const router = express.Router();

// ─── Base de Datos de Usuarios y Tokens Predefinidos ──────────────────────────
const USUARIOS = {
  'token-admin-000': { email: 'administrador', nombre: 'administrador', role: 'admin', id: '00000000-0000-0000-0000-000000000000' },
  'token-alejandro-111': { email: 'Alejandro', nombre: 'Alejandro', role: 'mensajero', id: '11111111-1111-1111-1111-111111111111' },
  'token-victor-222': { email: 'Victor', nombre: 'Victor', role: 'mensajero', id: '22222222-2222-2222-2222-222222222222' },
  'token-laura-333': { email: 'Laura', nombre: 'Laura', role: 'mensajero', id: '33333333-3333-3333-3333-333333333333' }
};

// Middleware: Verificar inicio de sesión obligatorio
function requerirAutenticacion(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ exito: false, mensaje: 'Inicio de sesión obligatorio para realizar esta acción.' });
  }
  const token = authHeader.split(' ')[1];
  const usuario = USUARIOS[token];
  if (!usuario) {
    return res.status(401).json({ exito: false, mensaje: 'Sesión inválida o expirada.' });
  }
  req.user = usuario;
  next();
}

// Middleware: Verificar rol de administrador
function requerirAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ exito: false, mensaje: 'Acceso denegado. Se requiere rol de administrador.' });
  }
  next();
}

// Helper para parsear JSON seguro
function parseJSON(str) {
  try {
    return JSON.parse(str || '{}');
  } catch {
    return { raw: str };
  }
}

function normalizarMetodoPago(valor) {
  const metodo = String(valor || '').toLowerCase();
  if (metodo === 'transferencia' || metodo === 'tarjeta' || metodo === 'efectivo') {
    return metodo;
  }
  return 'no_especificado';
}

function inferirTipoTramite({ textoCompleto = '', organismoTransito = '' } = {}) {
  const texto = String(textoCompleto).toLowerCase();
  const organismo = String(organismoTransito).toLowerCase();

  if (texto.includes('matricula') || texto.includes('matrícula')) return 'Matrícula';
  if (texto.includes('refrendo')) return 'Refrendo';
  if (texto.includes('soat') || texto.includes('seguro')) return 'SOAT';
  if (texto.includes('placa') || texto.includes('pico y placa')) return 'Placa';
  if (organismo.includes('simit')) return 'SIMIT';
  if (organismo.includes('movilidad')) return 'Movilidad';
  if (organismo.includes('transito')) return 'Tránsito';

  return 'General';
}

/**
 * POST /api/procesar-factura
 * Procesa la imagen con OCR (OCR Space) y la devuelve convertida en Base64.
 */
router.post('/procesar-factura', requerirAutenticacion, upload.single('imagen'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      exito: false,
      mensaje: 'No se recibió ninguna imagen. Envía el archivo con el campo "imagen".',
    });
  }

  try {
    console.log(`[OCR Space] Procesando imagen para ${req.user.nombre}: ${req.file.originalname}`);

    // Convertir el buffer de la imagen cargada a base64 para guardarlo y mostrarlo
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

    // Construir FormData para OCR Space enviando el archivo como Blob
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', blob, req.file.originalname);
    formData.append('language', 'spa');

    // Enviar a OCR Space
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': 'K86908507788957'
      },
      body: formData
    });

    const result = await response.json();

    if (result.IsErroredOnProcessing) {
      throw new Error(result.ErrorMessage[0] || 'Error en OCR Space');
    }

    // Extraer texto
    const parsedResults = result.ParsedResults || [];
    const textoExtraido = parsedResults.length > 0 ? parsedResults[0].ParsedText : '';

    console.log(`[OCR Space] Finalizado exitosamente.`);

    // Analizar el texto con regex para sugerir todos los campos requeridos
    const camposSugeridos = parsearFactura(textoExtraido);

    return res.status(200).json({
      exito: true,
      confianzaOCR: 100, // OCR Space no devuelve confianza global de la misma manera
      textoCompleto: textoExtraido,
      camposSugeridos: {
        placa: camposSugeridos.placa,
        valor_tramite: camposSugeridos.valorTotal,
        numero_recibo: camposSugeridos.numeroFactura,
        organismo_transito: camposSugeridos.organismoTransito,
        fecha_recibo: camposSugeridos.fechaRecibo,
      },
      imagen_original: dataUrl,
      mensaje: 'Imagen procesada correctamente con OCR Space.',
    });

  } catch (error) {
    console.error('[OCR Space] Error al procesar la imagen:', error.message);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al procesar la imagen con OCR Space.',
      detalle: error.message,
    });
  }
});

/**
 * POST /api/guardar-factura
 * Guarda la factura procesada y validada en Supabase, inyectando mensajero,
 * usuario_id y fecha_carga del sistema y la sesión.
 */
router.post('/guardar-factura', requerirAutenticacion, async (req, res) => {
  const { organismo_transito, numero_recibo, fecha_recibo, placa, valor_tramite, datos_ocr, imagen_original, payment_method, tipo_tramite } = req.body;

  const camposFaltantes = [
    'organismo_transito', 'numero_recibo', 'fecha_recibo', 'placa', 'valor_tramite', 'imagen_original', 'payment_method', 'tipo_tramite'
  ].filter((campo) => req.body[campo] === undefined || req.body[campo] === '');

  if (camposFaltantes.length > 0) {
    return res.status(400).json({
      exito: false,
      mensaje: `Faltan campos obligatorios: ${camposFaltantes.join(', ')}`,
    });
  }

  const metodoPago = normalizarMetodoPago(payment_method);
  const tipoTramite = String(tipo_tramite || '').trim() || inferirTipoTramite({
    textoCompleto: datos_ocr?.textoCompleto,
    organismoTransito: organismo_transito
  });

  // Mapear los campos requeridos a las columnas de la tabla 'facturas_ocr' de Supabase
  const registro = {
    id_mensajero: null,                           // Evita la constraint de clave foránea de Supabase
    organismo_transito: organismo_transito,      // organismo_transito
    numero_factura: numero_recibo,                // numero_recibo
    fecha_factura: fecha_recibo,                  // fecha_recibo
    placa: placa.toUpperCase(),                   // placa
    tipo_tramite: JSON.stringify({
      ...datos_ocr,
      payment_method: metodoPago,
      tipo_tramite: tipoTramite,
      mensajero: req.user.nombre,
      id_mensajero: req.user.id
    }),                                           // Almacena datos_ocr y la identidad del mensajero
    valor_total: parseFloat(String(valor_tramite).replace(/[^0-9.]/g, '')), // valor_tramite
    url_foto: imagen_original,                    // imagen_original (base64 string)
    estado_validacion: 'Pendiente'                // Para cumplir con la restricción check_constraint de la BD
  };

  console.log(`[Supabase] Insertando factura para ${req.user.nombre}`);

  try {
    const { data, error } = await supabase
      .from('facturas_ocr')
      .insert([registro])
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error al insertar:', error.message);
      return res.status(500).json({
        exito: false,
        mensaje: 'Error al guardar la factura en la base de datos.',
        detalle: error.message
      });
    }

    // Mapear la respuesta de la base de datos de vuelta al formato requerido
    const datosOcr = parseJSON(data.tipo_tramite);
    const facturaMapeada = {
      id: data.id,
      organismo_transito: data.organismo_transito,
      numero_recibo: data.numero_factura,
      placa: data.placa,
      valor_tramite: data.valor_total,
      fecha_recibo: data.fecha_factura,
      datos_ocr: datosOcr,
      payment_method: datosOcr.payment_method || 'no_especificado',
      tipo_tramite: datosOcr.tipo_tramite || inferirTipoTramite({
        textoCompleto: datosOcr.textoCompleto,
        organismoTransito: data.organismo_transito
      }),
      mensajero: datosOcr.mensajero || req.user.nombre,
      usuario_id: data.id_mensajero,
      fecha_carga: data.created_at,
      imagen_original: data.url_foto
    };

    return res.status(201).json({
      exito: true,
      mensaje: 'Factura guardada correctamente.',
      factura: facturaMapeada
    });

  } catch (error) {
    console.error('[Supabase] Error inesperado:', error.message);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor.',
    });
  }
});

/**
 * GET /api/admin/facturas
 * Devuelve todas las facturas del sistema. Solo para Administrador.
 */
router.get('/admin/facturas', requerirAutenticacion, requerirAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('facturas_ocr')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Error al consultar:', error.message);
      return res.status(500).json({
        exito: false,
        mensaje: 'Error al consultar las facturas en la base de datos.',
      });
    }

    // Mapear registros de vuelta al formato requerido
    const facturasMapeadas = data.map((f) => {
      const datosOcr = parseJSON(f.tipo_tramite);
      return {
        id: f.id,
        organismo_transito: f.organismo_transito,
        numero_recibo: f.numero_factura,
        placa: f.placa,
        valor_tramite: f.valor_total,
        fecha_recibo: f.fecha_factura,
        datos_ocr: datosOcr,
        payment_method: datosOcr.payment_method || 'no_especificado',
        tipo_tramite: datosOcr.tipo_tramite || inferirTipoTramite({
          textoCompleto: datosOcr.textoCompleto,
          organismoTransito: f.organismo_transito
        }),
        mensajero: datosOcr.mensajero || 'Administrador',
        usuario_id: datosOcr.id_mensajero || null,
        fecha_carga: f.created_at,
        imagen_original: f.url_foto
      };
    });

    return res.status(200).json({ exito: true, facturas: facturasMapeadas });

  } catch (error) {
    console.error('[Admin] Error inesperado:', error.message);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor.',
    });
  }
});

/**
 * GET /api/facturas
 * Devuelve únicamente las facturas del mensajero autenticado.
 */
router.get('/facturas', requerirAutenticacion, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('facturas_ocr')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Error al consultar cargas propias:', error.message);
      return res.status(500).json({
        exito: false,
        mensaje: 'Error al consultar sus facturas en la base de datos.',
      });
    }

    const facturasMapeadas = data.map((f) => {
      const datosOcr = parseJSON(f.tipo_tramite);
      return {
        id: f.id,
        organismo_transito: f.organismo_transito,
        numero_recibo: f.numero_factura,
        placa: f.placa,
        valor_tramite: f.valor_total,
        fecha_recibo: f.fecha_factura,
        datos_ocr: datosOcr,
        payment_method: datosOcr.payment_method || 'no_especificado',
        tipo_tramite: datosOcr.tipo_tramite || inferirTipoTramite({
          textoCompleto: datosOcr.textoCompleto,
          organismoTransito: f.organismo_transito
        }),
        mensajero: datosOcr.mensajero || 'Administrador',
        usuario_id: datosOcr.id_mensajero || null,
        fecha_carga: f.created_at,
        imagen_original: f.url_foto
      };
    });

    // Filtrar en memoria por el usuario_id almacenado en el JSON de tipo_tramite
    const facturasFiltradas = req.user.role === 'admin'
      ? facturasMapeadas
      : facturasMapeadas.filter((f) => f.usuario_id === req.user.id);

    return res.status(200).json({ exito: true, facturas: facturasFiltradas });

  } catch (error) {
    console.error('[Mensajero] Error inesperado:', error.message);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor.',
    });
  }
});

/**
 * DELETE /api/admin/facturas/:id
 * Elimina una factura por su ID. Solo para Administrador.
 */
router.delete('/admin/facturas/:id', requerirAutenticacion, requerirAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('facturas_ocr')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Supabase] Error al eliminar:', error.message);
      return res.status(500).json({
        exito: false,
        mensaje: 'Error al eliminar el registro de la base de datos.',
      });
    }

    return res.status(200).json({
      exito: true,
      mensaje: 'Registro eliminado correctamente.',
    });

  } catch (error) {
    console.error('[Admin Delete] Error inesperado:', error.message);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor.',
    });
  }
});

module.exports = router;
