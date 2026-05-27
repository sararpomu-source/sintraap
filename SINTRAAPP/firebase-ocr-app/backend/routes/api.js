const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadFactura, getFacturas, updateFactura, deleteFactura } = require('../controllers/ocrController');

// Usamos multer en memoria para poder pasarlo a Storage y a OCR
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/upload', upload.single('file'), uploadFactura);
router.get('/facturas', getFacturas);
router.put('/facturas/:id', updateFactura);
router.delete('/facturas/:id', deleteFactura);

module.exports = router;
