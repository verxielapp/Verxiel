const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-code', authController.resendCode);
router.get('/me', authMiddleware, authController.me);
router.put('/me', authMiddleware, authController.updateProfile);
router.post('/add-contact', authMiddleware, authController.addContact);
router.post('/add-contact-email', authMiddleware, authController.addContactByEmail);
router.get('/contacts', authMiddleware, authController.getContacts);
router.get('/find', authMiddleware, authController.findUser);
router.post('/block', authMiddleware, authController.blockUser);
router.post('/unblock', authMiddleware, authController.unblockUser);
router.post('/delete-contact', authMiddleware, authController.deleteContact);

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

module.exports = router; 