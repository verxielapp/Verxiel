const Message = require('../models/Message');
const User = require('../models/User');

// İki kullanıcı arasındaki mesajları getir
exports.getMessages = async (req, res) => {
  const { userId, to, groupId } = req.query;
  try {
    let filter = {};
    if (groupId) {
      filter.groupId = groupId;
    } else if (to) {
      // Bireysel sohbet: iki kullanıcı arasında giden ve gelen tüm mesajlar
      filter = {
        $or: [
          { from: userId, to },
          { from: to, to: userId }
        ]
      };
    }
    const messages = await Message.find(filter)
      .sort({ createdAt: 1 })
      .populate('from', 'displayName email')
      .populate('to', 'displayName email');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Mesajlar alınamadı', error: err.message });
  }
}; 