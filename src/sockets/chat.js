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
      // Kullanıcıyı kendi odasına ekle
      socket.join(payload.id.toString());
      next();
    } catch (err) {
      console.error('Socket auth error:', err);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.user.id);
    
    // Odaya katılma
    socket.on('join', (roomId) => {
      socket.join(roomId);
    });

    // Mesaj gönderme
    socket.on('message', async (data) => {
      console.log('Received message:', data);
      try {
        // data: { to, content, type, groupId, timestamp }
        let receiverId = data.to;
        
        // Eğer to alanı email ise, kullanıcıyı bul
        if (data.to && data.to.includes('@')) {
          const receiver = await User.findOne({ where: { email: data.to } });
          if (!receiver) {
            console.log('Receiver not found for email:', data.to);
            return;
          }
          receiverId = receiver.id;
        }
        
        // Eğer to alanı ID ise, direkt kullan
        if (data.to && !data.to.includes('@')) {
          receiverId = data.to;
        }
        
        // Engellenen kullanıcıdan mesaj gelmesin
        if (receiverId) {
          const receiver = await User.findByPk(receiverId);
          if (receiver && receiver.blocked && receiver.blocked.includes(socket.user.id)) {
            console.log('Message blocked by receiver');
            return; // Engellenmişse mesajı iletme
          }
        }
        
        const msg = await Message.create({
          fromId: socket.user.id,
          toId: receiverId,
          groupId: data.groupId,
          content: data.content,
          type: data.type || 'text',
          timestamp: data.timestamp || Date.now()
        });
        
        const populatedMsg = await Message.findByPk(msg.id, {
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
        
        console.log('Created message:', populatedMsg);
        
        // Bireysel veya grup mesajı ise ilgili odaya yayınla
        if (data.groupId) {
          io.to(data.groupId).emit('message', populatedMsg);
        } else if (receiverId) {
          // Alıcıya gönder
          io.to(receiverId.toString()).emit('message', populatedMsg);
          // Gönderene de gönder
          io.to(socket.user.id.toString()).emit('message', populatedMsg);
          
          // Otomatik kişi ekleme (her iki tarafa)
          const sender = await User.findByPk(socket.user.id);
          const receiver = await User.findByPk(receiverId);
          
          if (receiver && sender) {
            // Alıcının contact listesine göndericiyi ekle
            if (!receiver.contacts.includes(sender.id)) {
              receiver.contacts.push(sender.id);
              await receiver.save();
              console.log('Added sender to receiver contacts');
            }
            
            // Göndericinin contact listesine alıcıyı ekle
            if (!sender.contacts.includes(receiver.id)) {
              sender.contacts.push(receiver.id);
              await sender.save();
              console.log('Added receiver to sender contacts');
            }
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
    
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.user.id);
    });
  });
}; 