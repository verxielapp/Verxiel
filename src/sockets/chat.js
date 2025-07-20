const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'verxiel_secret';

module.exports = (io) => {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      socket.user = payload;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    // Odaya katılma
    socket.on('join', (roomId) => {
      socket.join(roomId);
    });

    // Mesaj gönderme
    socket.on('message', async (data) => {
      // data: { to, content, type, groupId }
      // Engellenen kullanıcıdan mesaj gelmesin
      if (data.to) {
        const receiver = await User.findById(data.to);
        if (receiver && receiver.blocked.includes(socket.user.id)) {
          return; // Engellenmişse mesajı iletme
        }
      }
      const msg = await Message.create({
        from: socket.user.id,
        to: data.to,
        groupId: data.groupId,
        content: data.content,
        type: data.type || 'text'
      });
      const populatedMsg = await Message.findById(msg._id)
        .populate('from', 'displayName email')
        .populate('to', 'displayName email');
      // Bireysel veya grup mesajı ise ilgili odaya yayınla
      if (data.groupId) {
        io.to(data.groupId).emit('message', populatedMsg);
      } else if (data.to) {
        io.to(data.to).emit('message', populatedMsg);
        io.to(socket.user.id).emit('message', populatedMsg); // gönderen de alsın
        // Otomatik kişi ekleme (her iki tarafa)
        if (data.to) {
          const sender = await User.findById(socket.user.id);
          const receiver = await User.findById(data.to);
          if (receiver && !receiver.contacts.includes(sender._id)) {
            receiver.contacts.push(sender._id);
            await receiver.save();
          }
          if (sender && !sender.contacts.includes(receiver._id)) {
            sender.contacts.push(receiver._id);
            await sender.save();
          }
        }
      }
    });
  });
}; 