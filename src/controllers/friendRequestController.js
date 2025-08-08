const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const { Op } = require('sequelize');

// Arkadaşlık isteği gönder
exports.sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverEmail, message } = req.body;

    // Alıcı kullanıcıyı bul
    const receiver = await User.findOne({ where: { email: receiverEmail } });
    if (!receiver) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    // Kendine istek göndermeyi engelle
    if (senderId === receiver.id) {
      return res.status(400).json({ message: 'Kendinize arkadaşlık isteği gönderemezsiniz' });
    }

    // Zaten istek var mı kontrol et
    const existingRequest = await FriendRequest.findOne({
      where: {
        [Op.or]: [
          { senderId, receiverId: receiver.id },
          { senderId: receiver.id, receiverId: senderId }
        ]
      }
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Bu kullanıcıyla zaten bir arkadaşlık isteği mevcut' });
    }

    // Yeni arkadaşlık isteği oluştur
    const friendRequest = await FriendRequest.create({
      senderId,
      receiverId: receiver.id,
      message
    });

    const populatedRequest = await FriendRequest.findByPk(friendRequest.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'displayName', 'email'] },
        { model: User, as: 'receiver', attributes: ['id', 'displayName', 'email'] }
      ]
    });

    res.status(201).json(populatedRequest);
  } catch (error) {
    console.error('Friend request send error:', error);
    res.status(500).json({ message: 'Arkadaşlık isteği gönderilemedi', error: error.message });
  }
};

// Gelen arkadaşlık isteklerini listele
exports.getReceivedRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await FriendRequest.findAll({
      where: {
        receiverId: userId,
        status: 'pending'
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'displayName', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(requests);
  } catch (error) {
    console.error('Get received requests error:', error);
    res.status(500).json({ message: 'Arkadaşlık istekleri alınamadı', error: error.message });
  }
};

// Gönderilen arkadaşlık isteklerini listele
exports.getSentRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await FriendRequest.findAll({
      where: {
        senderId: userId,
        status: 'pending'
      },
      include: [
        { model: User, as: 'receiver', attributes: ['id', 'displayName', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(requests);
  } catch (error) {
    console.error('Get sent requests error:', error);
    res.status(500).json({ message: 'Gönderilen istekler alınamadı', error: error.message });
  }
};

// Arkadaşlık isteğini kabul et
exports.acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const friendRequest = await FriendRequest.findOne({
      where: {
        id: requestId,
        receiverId: userId,
        status: 'pending'
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'displayName', 'email'] }
      ]
    });

    if (!friendRequest) {
      return res.status(404).json({ message: 'Arkadaşlık isteği bulunamadı' });
    }

    // İsteği kabul et
    friendRequest.status = 'accepted';
    await friendRequest.save();

    // Karşılıklı arkadaşlık ilişkisi kur
    const sender = await User.findByPk(friendRequest.senderId);
    const receiver = await User.findByPk(userId);

    // Contacts array'lerine ekle
    if (sender.contacts) {
      const senderContacts = JSON.parse(sender.contacts || '[]');
      if (!senderContacts.some(c => c.id === receiver.id)) {
        senderContacts.push({
          id: receiver.id,
          email: receiver.email,
          displayName: receiver.displayName
        });
        sender.contacts = JSON.stringify(senderContacts);
        await sender.save();
      }
    }

    if (receiver.contacts) {
      const receiverContacts = JSON.parse(receiver.contacts || '[]');
      if (!receiverContacts.some(c => c.id === sender.id)) {
        receiverContacts.push({
          id: sender.id,
          email: sender.email,
          displayName: sender.displayName
        });
        receiver.contacts = JSON.stringify(receiverContacts);
        await receiver.save();
      }
    }

    res.json({ message: 'Arkadaşlık isteği kabul edildi', request: friendRequest });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ message: 'İstek kabul edilemedi', error: error.message });
  }
};

// Arkadaşlık isteğini reddet
exports.rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const friendRequest = await FriendRequest.findOne({
      where: {
        id: requestId,
        receiverId: userId,
        status: 'pending'
      }
    });

    if (!friendRequest) {
      return res.status(404).json({ message: 'Arkadaşlık isteği bulunamadı' });
    }

    // İsteği reddet
    friendRequest.status = 'rejected';
    await friendRequest.save();

    res.json({ message: 'Arkadaşlık isteği reddedildi' });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({ message: 'İstek reddedilemedi', error: error.message });
  }
};

// Arkadaşlık isteğini iptal et (gönderen tarafından)
exports.cancelFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const friendRequest = await FriendRequest.findOne({
      where: {
        id: requestId,
        senderId: userId,
        status: 'pending'
      }
    });

    if (!friendRequest) {
      return res.status(404).json({ message: 'Arkadaşlık isteği bulunamadı' });
    }

    await friendRequest.destroy();
    res.json({ message: 'Arkadaşlık isteği iptal edildi' });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ message: 'İstek iptal edilemedi', error: error.message });
  }
};