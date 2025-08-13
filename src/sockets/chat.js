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
        // data: { to, content, type, groupId, timestamp, image }
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
        
        // Mesaj oluştur
        const msg = await Message.create({
          fromId: socket.user.id,
          toId: receiverId,
          groupId: data.groupId,
          content: data.content,
          image: data.image,
          type: data.type || 'text',
          timestamp: data.timestamp || Date.now()
        });
        
        console.log('Created message:', msg);
        
        // Mesajı populate et
        const populatedMsg = await Message.findByPk(msg.id, {
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
        
        console.log('Populated message:', populatedMsg);
        
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
            let contactsUpdated = false;
            
            // Alıcının contact listesine göndericiyi ekle
            const receiverContacts = receiver.contacts;
            if (!receiverContacts.includes(sender.id)) {
              receiverContacts.push(sender.id);
              receiver.contacts = receiverContacts;
              await receiver.save();
              console.log('Added sender to receiver contacts');
              contactsUpdated = true;
            }
            
            // Göndericinin contact listesine alıcıyı ekle
            const senderContacts = sender.contacts;
            if (!senderContacts.includes(receiver.id)) {
              senderContacts.push(receiver.id);
              sender.contacts = senderContacts;
              await sender.save();
              console.log('Added receiver to sender contacts');
              contactsUpdated = true;
            }
            
            // Eğer contacts güncellendiyse, her iki tarafa da yeni contact listesini gönder
            if (contactsUpdated) {
              // Göndericiye güncellenmiş contact listesini gönder
              const updatedSenderContacts = await User.findAll({
                where: { id: senderContacts },
                attributes: ['id', 'displayName', 'email', 'avatarUrl', 'username']
              });
              io.to(socket.user.id.toString()).emit('contacts_updated', updatedSenderContacts);
              
              // Alıcıya güncellenmiş contact listesini gönder
              const updatedReceiverContacts = await User.findAll({
                where: { id: receiverContacts },
                attributes: ['id', 'displayName', 'email', 'avatarUrl', 'username']
              });
              io.to(receiverId.toString()).emit('contacts_updated', updatedReceiverContacts);
            }
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
        // Hata durumunda göndericiye bilgi ver
        socket.emit('message_error', { error: 'Mesaj gönderilemedi' });
      }
    });
    
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.user.id);
    });
  });
}; 