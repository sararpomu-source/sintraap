const multer = require('multer');

// Usamos almacenamiento en memoria para no guardar archivos en disco.
// Tesseract.js puede leer directamente desde un Buffer.
const storage = multer.memoryStorage();

// Filtro: solo aceptar imágenes
const fileFilter = (req, file, cb) => {
  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];
  if (tiposPermitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no soportado. Use JPG, PNG, WEBP o TIFF.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB máximo
  },
});

module.exports = upload;
