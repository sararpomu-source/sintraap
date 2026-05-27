// Cargar variables de entorno desde .env antes de cualquier otro módulo
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const facturasRouter = require('./routes/facturas');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares globales ────────────────────────────────────────────────────

// Soporte para cuerpos JSON de hasta 50 MB
app.use(express.json({ limit: '50mb' }));

// Soporte para formularios codificados en URL de hasta 50 MB
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS: permite peticiones desde el frontend (todos los orígenes en desarrollo)
app.use(cors());

// ─── Rutas ───────────────────────────────────────────────────────────────────

// Todas las rutas de facturas viven bajo /api
app.use('/api', facturasRouter);

// Ruta de salud: útil para verificar que el servidor está activo
app.get('/health', (req, res) => {
  res.json({ estado: 'activo', timestamp: new Date().toISOString() });
});

// ─── Manejo de errores global ────────────────────────────────────────────────

// Captura errores de multer (archivo demasiado grande, tipo inválido, etc.)
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ exito: false, mensaje: 'La imagen supera el límite de 50 MB.' });
  }
  console.error('[Error]', err.message);
  res.status(500).json({ exito: false, mensaje: err.message });
});

// ─── Inicio del servidor ─────────────────────────────────────────────────────

// 1. Definimos el puerto de Railway o el 3000 por defecto si estás en tu PC
const port = process.env.PORT || 3000;

// 2. Agregamos '0.0.0.0' para que Railway pueda redirigir los usuarios a tu app
app.listen(port, '0.0.0.0', () => {
  console.log(`✓ Servidor SINTRAAPP corriendo en el puerto: ${port}`);
  console.log(`  Endpoint OCR listo para recibir peticiones`);
});

