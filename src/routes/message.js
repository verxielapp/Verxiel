const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, messageController.getMessages);
router.post('/send', authMiddleware, messageController.sendMessage);
router.post('/', authMiddleware, messageController.sendMessage); // Alternative endpoint
router.put('/:id', authMiddleware, messageController.updateMessage);
router.delete('/:id', authMiddleware, messageController.deleteMessage);
router.post('/mark-read', authMiddleware, messageController.markMessagesAsRead);

module.exports = router; 