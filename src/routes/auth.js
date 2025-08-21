const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-code', authController.resendCode);
router.get('/me', auth, authController.me);
router.put('/me', auth, authController.updateProfile);
router.post('/add-contact', auth, authController.addContact);
router.post('/add-contact-email', auth, authController.addContactByEmail);
router.get('/contacts', auth, authController.getContacts);
router.get('/find', auth, authController.findUser);
router.post('/block', auth, authController.blockUser);
router.post('/unblock', auth, authController.unblockUser);
router.post('/delete-contact', auth, authController.deleteContact);

// Admin moderation routes
router.post('/admin/ban', auth, auth.requireAdmin, adminController.banUser);
router.post('/admin/unban', auth, auth.requireAdmin, adminController.unbanUser);

// Test endpoint - kullanıcıları listele
router.get('/users', async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.findAll({
      attributes: ['id', 'email', 'displayName', 'username', 'verified', 'createdAt', 'updatedAt']
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Kullanıcılar listelenemedi', error: error.message });
  }
});

// Test endpoint - eski test kullanıcılarını temizle
router.delete('/cleanup-test-users', async (req, res) => {
  try {
    const User = require('../models/User');
    const deleted = await User.destroy({
      where: {
        email: {
          [require('sequelize').Op.like]: '%test%'
        }
      }
    });
    res.json({ message: `${deleted} test kullanıcısı silindi` });
  } catch (error) {
    res.status(500).json({ message: 'Temizlik başarısız', error: error.message });
  }
});

// Test kullanıcısı oluştur
router.post('/create-test-user', authController.createTestUser);

module.exports = router; 