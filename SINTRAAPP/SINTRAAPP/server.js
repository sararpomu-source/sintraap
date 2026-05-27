// Cargar variables de entorno desde .env antes de cualquier otro módulo
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path'); // Herramienta nativa para conectar carpetas
const facturasRouter = require('./routes/facturas');

const app = express();

// ─── Middlewares globales ────────────────────────────────────────────────────

// Soporte para cuerpos JSON y formularios de hasta 50 MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS: permite peticiones desde el frontend
app.use(cors());

// ─── Rutas de la API ─────────────────────────────────────────────────────────

// Todas las rutas de facturas viven bajo /api
app.use('/api', facturasRouter);

// Ruta de salud: útil para verificar que el servidor está activo
app.get('/health', (req, res) => {
  res.json({ estado: 'activo', timestamp: new Date().toISOString() });
});

// ─── Conexión con el Frontend (Interfaz Visual CORREGIDA) ────────────────────

// 1. Apuntamos un nivel hacia arriba (../) para encontrar la carpeta client
app.use(express.static(path.join(__dirname, '../client/dist')));

// 2. Cualquier ruta que no sea de la API, que cargue la pantalla visual (index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// ─── Manejo de errores global ────────────────────────────────────────────────

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ exito: false, mensaje: 'La imagen supera el límite de 50 MB.' });
  }
  console.error('[Error]', err.message);
  res.status(500).json({ exito: false, mensaje: err.message });
});

// ─── Inicio del servidor ─────────────────────────────────────────────────────

// Definimos el puerto dinámico para Railway, o el 3000 si estás en tu PC
const port = process.env.PORT || 3000;

// Escuchamos en el puerto asignado y en '0.0.0.0' para permitir accesos externos
app.listen(port, '0.0.0.0', () => {
  console.log(`✓ Servidor SINTRAAPP corriendo en el puerto: ${port}`);
  console.log(`  Endpoint OCR listo para recibir peticiones`);
});
