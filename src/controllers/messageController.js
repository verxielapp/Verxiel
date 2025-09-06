const Message = require('../models/Message');
const User = require('../models/User');

// Mesaj gönderme
exports.sendMessage = async (req, res) => {
  try {
    const { to, content, type = 'text', image, groupId } = req.body;
    const fromId = req.user.id;

    if (!to && !groupId) {
      return res.status(400).json({ message: 'Alıcı veya grup ID gerekli' });
    }

    if (!content && !image) {
      return res.status(400).json({ message: 'Mesaj içeriği veya resim gerekli' });
    }

    let toId = to;
    
    // Eğer to alanı email ise, kullanıcıyı bul
    if (to && to.includes('@')) {
      const receiver = await User.findOne({ where: { email: to } });
      if (!receiver) {
        return res.status(404).json({ message: 'Alıcı bulunamadı' });
      }
      toId = receiver.id;
    }

    // Mesaj oluştur
    const message = await Message.create({
      fromId: fromId,
      toId: toId,
      groupId: groupId,
      content: content,
      image: image,
      type: type,
      timestamp: Date.now()
    });

    // Mesajı populate et
    const populatedMessage = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'from',
          attributes: ['id', 'displayName', 'email', 'username']
        },
        {
          model: User,
          as: 'to',
          attributes: ['id', 'displayName', 'email', 'username']
        }
      ]
    });

    console.log('Message sent via HTTP:', populatedMessage);

    res.status(201).json({
      success: true,
      message: 'Mesaj gönderildi',
      data: populatedMessage
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      message: 'Mesaj gönderilemedi', 
      error: error.message 
    });
  }
};

// İki kullanıcı arasındaki mesajları getir
exports.getMessages = async (req, res) => {
  const { userId, to, groupId } = req.query;
  try {
    let whereClause = {};
    
    if (groupId) {
      whereClause.groupId = groupId;
    } else if (to) {
      // Bireysel sohbet: iki kullanıcı arasında giden ve gelen tüm mesajlar
      const { Op } = require('sequelize');
      whereClause = {
        [Op.or]: [
          { fromId: userId, toId: to },
          { fromId: to, toId: userId }
        ]
      };
    }
    
    const messages = await Message.findAll({
      where: whereClause,
      order: [['createdAt', 'ASC']],
      include: [
        {
          model: User,
          as: 'from',
          attributes: ['id', 'displayName', 'email']
        },
        {
          model: User,
          as: 'to',
          attributes: ['id', 'displayName', 'email']
        }
      ]
    });
    
    console.log('Fetched messages:', messages.length);
    console.log('Query params:', { userId, to, groupId });
    console.log('Where clause:', whereClause);
    
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ message: 'Mesajlar alınamadı', error: err.message });
  }
}; 