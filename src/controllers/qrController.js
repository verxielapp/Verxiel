const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// QR kod veritabanı (gerçek uygulamada Redis kullanılmalı)
const qrCodes = new Map();

// QR kod oluştur
const generateQR = async (req, res) => {
    try {
        // Benzersiz QR kod oluştur
        const qrCode = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 dakika

        // QR kodu veritabanına kaydet
        qrCodes.set(qrCode, {
            status: 'pending',
            expiresAt: expiresAt,
            createdAt: new Date()
        });

        res.json({
            success: true,
            qrCode: qrCode,
            expiresAt: expiresAt
        });
    } catch (error) {
        console.error('QR kod oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'QR kod oluşturulamadı'
        });
    }
};

// QR kod durumunu kontrol et
const checkQRStatus = async (req, res) => {
    try {
        const { qrCode } = req.body;

        if (!qrCode) {
            return res.status(400).json({
                success: false,
                message: 'QR kod gerekli'
            });
        }

        const qrData = qrCodes.get(qrCode);

        if (!qrData) {
            return res.status(404).json({
                success: false,
                message: 'QR kod bulunamadı'
            });
        }

        // Süre kontrolü
        if (new Date() > qrData.expiresAt) {
            qrCodes.delete(qrCode);
            return res.json({
                success: true,
                status: 'expired'
            });
        }

        res.json({
            success: true,
            status: qrData.status,
            token: qrData.token || null
        });
    } catch (error) {
        console.error('QR kod durum kontrolü hatası:', error);
        res.status(500).json({
            success: false,
            message: 'QR kod durumu kontrol edilemedi'
        });
    }
};

// QR kod tara (telefon uygulamasından)
const scanQR = async (req, res) => {
    try {
        const { qrCode } = req.body;
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!qrCode) {
            return res.status(400).json({
                success: false,
                message: 'QR kod gerekli'
            });
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token gerekli'
            });
        }

        // Token'ı doğrula
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Geçersiz token'
            });
        }

        const qrData = qrCodes.get(qrCode);

        if (!qrData) {
            return res.json({
                success: true,
                status: 'invalid'
            });
        }

        // Süre kontrolü
        if (new Date() > qrData.expiresAt) {
            qrCodes.delete(qrCode);
            return res.json({
                success: true,
                status: 'expired'
            });
        }

        // QR kodu onayla ve token oluştur
        const newToken = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        qrData.status = 'confirmed';
        qrData.token = newToken;
        qrData.userId = user.id;

        res.json({
            success: true,
            status: 'success'
        });
    } catch (error) {
        console.error('QR kod tarama hatası:', error);
        res.status(500).json({
            success: false,
            message: 'QR kod taranamadı'
        });
    }
};

// QR kod ile giriş (web uygulamasından)
const qrLogin = async (req, res) => {
    try {
        const { qrCode } = req.body;

        if (!qrCode) {
            return res.status(400).json({
                success: false,
                message: 'QR kod gerekli'
            });
        }

        const qrData = qrCodes.get(qrCode);

        if (!qrData) {
            return res.json({
                success: true,
                status: 'invalid'
            });
        }

        // Süre kontrolü
        if (new Date() > qrData.expiresAt) {
            qrCodes.delete(qrCode);
            return res.json({
                success: true,
                status: 'expired'
            });
        }

        if (qrData.status === 'confirmed' && qrData.token) {
            // Kullanıcı bilgilerini al
            const user = await User.findByPk(qrData.userId);
            
            if (user) {
                // QR kodu temizle
                qrCodes.delete(qrCode);

                res.json({
                    success: true,
                    status: 'confirmed',
                    token: qrData.token,
                    user: {
                        id: user.id,
                        email: user.email,
                        displayName: user.displayName,
                        username: user.username
                    }
                });
            } else {
                res.json({
                    success: true,
                    status: 'invalid'
                });
            }
        } else {
            res.json({
                success: true,
                status: qrData.status
            });
        }
    } catch (error) {
        console.error('QR kod giriş hatası:', error);
        res.status(500).json({
            success: false,
            message: 'QR kod girişi yapılamadı'
        });
    }
};

// Eski QR kodları temizle (her 5 dakikada bir çalıştırılmalı)
const cleanupExpiredQRCodes = () => {
    const now = new Date();
    for (const [qrCode, data] of qrCodes.entries()) {
        if (now > data.expiresAt) {
            qrCodes.delete(qrCode);
        }
    }
};

// Her 5 dakikada bir eski QR kodları temizle
setInterval(cleanupExpiredQRCodes, 5 * 60 * 1000);

module.exports = {
    generateQR,
    checkQRStatus,
    scanQR,
    qrLogin
}; 