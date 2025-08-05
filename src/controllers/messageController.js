const Message = require('../models/Message');
const User = require('../models/User');

// İki kullanıcı arasındaki mesajları getir
exports.getMessages = async (req, res) => {
  const { userId, to, groupId } = req.query;
  try {
    let whereClause = {};
    
    if (groupId) {
      whereClause.groupId = groupId;
    } else if (to) {
      // Bireysel sohbet: iki kullanıcı arasında giden ve gelen tüm mesajlar
      whereClause = {
        $or: [
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