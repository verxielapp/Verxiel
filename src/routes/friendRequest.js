const express = require('express');
const router = express.Router();
const friendRequestController = require('../controllers/friendRequestController');
const authMiddleware = require('../middleware/authMiddleware');

// Arkadaşlık isteği gönder
router.post('/send', authMiddleware, friendRequestController.sendFriendRequest);

// Gelen arkadaşlık isteklerini listele
router.get('/received', authMiddleware, friendRequestController.getReceivedRequests);

// Gönderilen arkadaşlık isteklerini listele
router.get('/sent', authMiddleware, friendRequestController.getSentRequests);

// Arkadaşlık isteğini kabul et
router.post('/:requestId/accept', authMiddleware, friendRequestController.acceptFriendRequest);

// Arkadaşlık isteğini reddet
router.post('/:requestId/reject', authMiddleware, friendRequestController.rejectFriendRequest);

// Arkadaşlık isteğini iptal et
router.post('/:requestId/cancel', authMiddleware, friendRequestController.cancelFriendRequest);

module.exports = router;