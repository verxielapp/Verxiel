const express = require('express');
const router = express.Router();
const friendRequestController = require('../controllers/friendRequestController');
const auth = require('../middleware/auth');

// Arkadaşlık isteği gönder
router.post('/send', auth, friendRequestController.sendFriendRequest);

// Gelen arkadaşlık isteklerini listele
router.get('/received', auth, friendRequestController.getReceivedRequests);

// Gönderilen arkadaşlık isteklerini listele
router.get('/sent', auth, friendRequestController.getSentRequests);

// Arkadaşlık isteğini yanıtla (kabul et/reddet)
router.post('/respond', auth, friendRequestController.respondToRequest);

// Arkadaşlık isteğini iptal et
router.delete('/:requestId', auth, friendRequestController.cancelRequest);

module.exports = router;