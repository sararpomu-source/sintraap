require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rutas
app.use('/api', apiRoutes);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('[Error General]', err.stack);
  res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`✓ Servidor Backend OCR corriendo en http://localhost:${PORT}`);
});
