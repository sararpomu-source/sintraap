// Cargar variables de entorno desde .env antes de cualquier otro módulo
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path'); // <-- AGREGAMOS ESTO (Es una herramienta nativa para carpetas)
const facturasRouter = require('./routes/facturas');

const app = express();

// ─── Middlewares globales ────────────────────────────────────────────────────

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

// ─── Rutas de la API ─────────────────────────────────────────────────────────

app.use('/api', facturasRouter);

app.get('/health', (req, res) => {
  res.json({ estado: 'activo', timestamp: new Date().toISOString() });
});

// ─── CONEXIÓN CON EL FRONTEND (AÑADE ESTO AQUÍ) ──────────────────────────────

// 1. Le decimos al servidor dónde están los archivos estáticos del cliente (Vite usa la carpeta 'dist')
app.use(express.static(path.join(__dirname, 'client/dist')));

// 2. Cualquier ruta que no sea de la API, que cargue el diseño visual (index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
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

const port = process.env.PORT || 3000;

app.listen(port, '0.0.0.0', () => {
  console.log(`✓ Servidor SINTRAAPP corriendo en el puerto: ${port}`);
  console.log(`  Endpoint OCR listo para recibir peticiones`);
});
