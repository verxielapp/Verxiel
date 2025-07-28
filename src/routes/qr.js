const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const authMiddleware = require('../middleware/authMiddleware');

// QR kod oluştur (web uygulamasından)
router.post('/generate-qr', qrController.generateQR);

// QR kod durumunu kontrol et (web uygulamasından)
router.post('/qr-login', qrController.qrLogin);

// QR kod tara (telefon uygulamasından - token gerekli)
router.post('/scan-qr', authMiddleware, qrController.scanQR);

module.exports = router; 