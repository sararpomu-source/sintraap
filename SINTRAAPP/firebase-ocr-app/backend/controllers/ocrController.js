const { db, bucket, firebaseReady } = require('../config/firebase');
const { extraerDatosGemini } = require('../utils/gemini');
const { validarFactura, detectarOrganismo } = require('../utils/validators');

// Almacenamiento en memoria como fallback cuando Firebase no está configurado
let memoryStore = [];
let memoryIdCounter = 1;

async function uploadFactura(req, res) {
  if (!req.file) {
    return res.status(400).json({ exito: false, mensaje: 'No se recibió imagen' });
  }

  try {
    console.log(`[Upload] Procesando: ${req.file.originalname}`);

    // 1. Enviar a OCR Space
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', blob, req.file.originalname);
    formData.append('language', 'spa');
    formData.append('isTable', 'true');
    formData.append('OCREngine', '2');

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'apikey': process.env.OCR_API_KEY || 'K86908507788957' },
      body: formData
    });
    const ocrResult = await ocrResponse.json();

    if (ocrResult.IsErroredOnProcessing) {
      throw new Error((ocrResult.ErrorMessage && ocrResult.ErrorMessage[0]) || 'Error en OCR Space');
    }

    const parsedResults = ocrResult.ParsedResults || [];
    const textoOCR = parsedResults.length > 0 ? parsedResults[0].ParsedText : '';

    if (!textoOCR.trim()) {
      return res.status(400).json({ exito: false, mensaje: 'El OCR no pudo extraer texto. La imagen puede estar borrosa o vacía.' });
    }

    console.log('[OCR] Texto extraído correctamente. Enviando a Gemini...');

    // 2. Extraer datos con Gemini
    let datosExtraidos;
    try {
      datosExtraidos = await extraerDatosGemini(textoOCR);
    } catch (geminiError) {
      console.warn('[Gemini] Falló la extracción con IA. Usando datos del OCR en bruto.');
      datosExtraidos = { organismo_transito: '', placa: '', numero_recibo: '', valor: '', fecha: '' };
    }

    // Mejorar organismo de tránsito con diccionario si Gemini no lo encontró
    const organismoDetectado = detectarOrganismo(textoOCR);
    if (!datosExtraidos.organismo_transito && organismoDetectado) {
      datosExtraidos.organismo_transito = organismoDetectado;
    }

    // 3. Validar con Regex
    const erroresValidacion = validarFactura(datosExtraidos);
    const estado = erroresValidacion.length === 0 ? 'Valido' : 'Pendiente Revisión';

    // 4. Preparar imagen en base64 para visualización
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

    // 5. Subir imagen a Firebase Storage (si está configurado)
    let imageUrl = dataUrl; // fallback: imagen en base64
    if (bucket) {
      try {
        const fileName = `facturas/${Date.now()}-${req.file.originalname}`;
        const file = bucket.file(fileName);
        await file.save(req.file.buffer, {
          metadata: { contentType: req.file.mimetype }
        });
        await file.makePublic();
        imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      } catch (storageErr) {
        console.warn('[Storage] No se pudo subir a Firebase Storage, usando base64:', storageErr.message);
      }
    }

    // 6. Construir registro
    const registro = {
      organismo_transito: datosExtraidos.organismo_transito || '',
      placa: datosExtraidos.placa || '',
      numero_recibo: datosExtraidos.numero_recibo || '',
      valor: datosExtraidos.valor || '',
      fecha: datosExtraidos.fecha || '',
      textoOCR: textoOCR,
      estadoValidacion: estado,
      erroresValidacion: erroresValidacion,
      imageUrl: imageUrl,
      fechaCarga: new Date().toISOString(),
      timestamp: Date.now()
    };

    // 7. Guardar en Firestore o en memoria
    let idGenerado;
    if (db) {
      // Verificar duplicados por numero de recibo
      if (datosExtraidos.numero_recibo) {
        const duplicado = await db.collection('facturas').where('numero_recibo', '==', datosExtraidos.numero_recibo).get();
        if (!duplicado.empty) {
          return res.status(409).json({ exito: false, mensaje: `Factura duplicada. El recibo ${datosExtraidos.numero_recibo} ya existe.` });
        }
      }
      const docRef = await db.collection('facturas').add(registro);
      idGenerado = docRef.id;
    } else {
      // Fallback: guardar en memoria
      idGenerado = String(memoryIdCounter++);
      memoryStore.push({ id: idGenerado, ...registro });
    }

    console.log(`[OK] Factura guardada con ID: ${idGenerado}`);

    res.status(200).json({
      exito: true,
      mensaje: 'Procesado correctamente',
      datos: { id: idGenerado, ...registro }
    });

  } catch (error) {
    console.error('[Error] uploadFactura:', error.message);
    res.status(500).json({ exito: false, mensaje: error.message });
  }
}

async function getFacturas(req, res) {
  try {
    if (db) {
      const snapshot = await db.collection('facturas').orderBy('timestamp', 'desc').get();
      const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json({ exito: true, datos });
    } else {
      // Fallback: memoria
      const sorted = [...memoryStore].sort((a, b) => b.timestamp - a.timestamp);
      return res.json({ exito: true, datos: sorted });
    }
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
}

async function updateFactura(req, res) {
  try {
    const id = req.params.id;
    const body = req.body;
    if (db) {
      await db.collection('facturas').doc(id).update(body);
    } else {
      const idx = memoryStore.findIndex(f => f.id === id);
      if (idx !== -1) Object.assign(memoryStore[idx], body);
    }
    res.json({ exito: true });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
}

async function deleteFactura(req, res) {
  try {
    const id = req.params.id;
    if (db) {
      await db.collection('facturas').doc(id).delete();
    } else {
      memoryStore = memoryStore.filter(f => f.id !== id);
    }
    res.json({ exito: true });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
}

module.exports = { uploadFactura, getFacturas, updateFactura, deleteFactura };
