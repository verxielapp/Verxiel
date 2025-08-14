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
        }
        
        // Kişi listelerini güncelle
        try {
          const sender = await User.findByPk(socket.user.id);
          const receiver = await User.findByPk(receiverId);
          
          if (sender && receiver) {
            // Gönderenin kişi listesini güncelle
            let senderContacts = sender.contacts || [];
            if (!senderContacts.includes(receiver.id)) {
              senderContacts.push(receiver.id);
              sender.contacts = senderContacts;
              await sender.save();
            }
            
            // Alıcının kişi listesini güncelle
            let receiverContacts = receiver.contacts || [];
            if (!receiverContacts.includes(sender.id)) {
              receiverContacts.push(sender.id);
              receiver.contacts = receiverContacts;
              await receiver.save();
            }
            
            // Her iki tarafa da güncellenmiş kişi listelerini gönder
            io.to(socket.user.id.toString()).emit('contacts_updated', senderContacts);
            io.to(receiverId.toString()).emit('contacts_updated', receiverContacts);
          }
        } catch (error) {
          console.error('Error updating contacts:', error);
        }
        
      } catch (error) {
        console.error('Message creation error:', error);
        socket.emit('message_error', { message: 'Mesaj gönderilemedi' });
      }
    });
    
    // VOIP Event'leri
    socket.on('call_offer', async (data) => {
      console.log('Call offer received:', data);
      try {
        const { to, type, offer } = data;
        const sender = await User.findByPk(socket.user.id);
        
        // Alıcıya arama teklifini gönder
        io.to(to.toString()).emit('call_offer', {
          from: {
            id: sender.id,
            displayName: sender.displayName,
            username: sender.username,
            email: sender.email
          },
          type: type,
          offer: offer
        });
        
      } catch (error) {
        console.error('Call offer error:', error);
        socket.emit('call_error', { message: 'Arama başlatılamadı' });
      }
    });
    
    socket.on('call_answer', async (data) => {
      console.log('Call answer received:', data);
      try {
        const { to, answer } = data;
        
        // Arayan tarafa cevabı gönder
        io.to(to.toString()).emit('call_answer', {
          answer: answer
        });
        
      } catch (error) {
        console.error('Call answer error:', error);
        socket.emit('call_error', { message: 'Arama cevabı gönderilemedi' });
      }
    });
    
    socket.on('call_reject', async (data) => {
      console.log('Call reject received:', data);
      try {
        const { to } = data;
        
        // Arayan tarafa reddetme bilgisini gönder
        io.to(to.toString()).emit('call_reject', {});
        
      } catch (error) {
        console.error('Call reject error:', error);
        socket.emit('call_error', { message: 'Arama reddedilemedi' });
      }
    });
    
    socket.on('call_end', async (data) => {
      console.log('Call end received:', data);
      try {
        const { to } = data;
        
        // Karşı tarafa arama sonlandırma bilgisini gönder
        io.to(to.toString()).emit('call_end', {});
        
      } catch (error) {
        console.error('Call end error:', error);
        socket.emit('call_error', { message: 'Arama sonlandırılamadı' });
      }
    });
    
    socket.on('ice_candidate', async (data) => {
      console.log('ICE candidate received:', data);
      try {
        const { to, candidate } = data;
        
        // Karşı tarafa ICE candidate'ı gönder
        io.to(to.toString()).emit('ice_candidate', {
          candidate: candidate
        });
        
      } catch (error) {
        console.error('ICE candidate error:', error);
        socket.emit('call_error', { message: 'ICE candidate gönderilemedi' });
      }
    });
    
    // Güvenli VOIP Event'leri
    socket.on('key_exchange_init', async (data) => {
      console.log('Key exchange init received:', data);
      try {
        const { to, publicKey, sessionKey } = data;
        const sender = await User.findByPk(socket.user.id);
        
        // Alıcıya key exchange response gönder
        io.to(to.toString()).emit('key_exchange_response', {
          from: {
            id: sender.id,
            displayName: sender.displayName,
            username: sender.username,
            email: sender.email
          },
          publicKey: publicKey,
          sessionKey: sessionKey
        });
        
      } catch (error) {
        console.error('Key exchange init error:', error);
        socket.emit('call_error', { message: 'Key exchange başlatılamadı' });
      }
    });
    
    socket.on('secure_call_offer', async (data) => {
      console.log('Secure call offer received:', data);
      try {
        const { to, type, offer, sessionId } = data;
        const sender = await User.findByPk(socket.user.id);
        
        // Alıcıya güvenli arama teklifini gönder
        io.to(to.toString()).emit('secure_call_offer', {
          from: {
            id: sender.id,
            displayName: sender.displayName,
            username: sender.username,
            email: sender.email
          },
          type: type,
          offer: offer,
          sessionId: sessionId
        });
        
      } catch (error) {
        console.error('Secure call offer error:', error);
        socket.emit('call_error', { message: 'Güvenli arama başlatılamadı' });
      }
    });
    
    socket.on('secure_call_answer', async (data) => {
      console.log('Secure call answer received:', data);
      try {
        const { to, answer, sessionId } = data;
        
        // Arayan tarafa güvenli cevabı gönder
        io.to(to.toString()).emit('secure_call_answer', {
          answer: answer,
          sessionId: sessionId
        });
        
      } catch (error) {
        console.error('Secure call answer error:', error);
        socket.emit('call_error', { message: 'Güvenli arama cevabı gönderilemedi' });
      }
    });
    
    socket.on('secure_ice_candidate', async (data) => {
      console.log('Secure ICE candidate received:', data);
      try {
        const { to, candidate, sessionId } = data;
        
        // Karşı tarafa şifrelenmiş ICE candidate'ı gönder
        io.to(to.toString()).emit('secure_ice_candidate', {
          candidate: candidate,
          sessionId: sessionId
        });
        
      } catch (error) {
        console.error('Secure ICE candidate error:', error);
        socket.emit('call_error', { message: 'Şifrelenmiş ICE candidate gönderilemedi' });
      }
    });
    
    // Bağlantı kesildiğinde
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.user.id);
    });
  });
}; 