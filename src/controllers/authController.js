const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'verxiel_secret';

// GMAIL SMTP - Gerçek email gönderimi (Environment Variables ile güvenli)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'verxielapp@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'butt qhis zfvd noxp'
  }
});

// Test email konfigürasyonu
transporter.verify(function(error, success) {
  if (error) {
    console.log('❌ Email konfigürasyon hatası:', error.message);
    console.log('⚠️  Email gönderimi çalışmayacak! Gmail App Password ayarlayın.');
    console.log('📧 Gmail App Password oluşturma:');
    console.log('   1. Gmail → Google Hesabı → Güvenlik → 2 Adımlı Doğrulama (açık)');
    console.log('   2. Uygulama Şifreleri → Diğer → Verxiel → Şifre oluştur');
    console.log('   3. Oluşan 16 haneli şifreyi kodda "your-gmail-app-password" yerine yazın');
  } else {
    console.log('✅ Gmail SMTP sunucusu hazır');
    console.log('📧 Gerçek email gönderimi aktif!');
  }
});

function validateEmail(email) {
  const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  return re.test(email);
}

exports.register = async (req, res) => {
  const { email, password, displayName, username } = req.body;
  try {
    // Gerekli alanları kontrol et
    if (!email || !password || !displayName || !username) {
      return res.status(400).json({ message: 'Tüm alanlar gereklidir!' });
    }

    // E-posta formatını kontrol et
    if (!validateEmail(email)) return res.status(400).json({ message: 'Geçersiz e-posta formatı!' });
    
    // Şifre uzunluğunu kontrol et
    if (password.length < 6) {
      return res.status(400).json({ message: 'Şifre en az 6 karakter olmalıdır!' });
    }

    // Kullanıcı adı uzunluğunu kontrol et
    if (username.length < 3) {
      return res.status(400).json({ message: 'Kullanıcı adı en az 3 karakter olmalıdır!' });
    }

    // Kullanıcı adı formatını kontrol et
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ message: 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir!' });
    }
    
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanılıyor!' });
    
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanılıyor!' });
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Email doğrulama kodu oluştur
    const emailCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const user = await User.create({ 
      email, 
      passwordHash, 
      displayName, 
      username, 
      verified: false, // Email doğrulaması gerekli
      emailCode: emailCode 
    });
    
    // Email gönder
    try {
      console.log('Email gönderiliyor:', email);
      console.log('Email kodu:', emailCode);
      
      const mailOptions = {
        from: '"Verxiel" <noreply@verxiel.app>',
        to: email,
        subject: 'Verxiel - Email Doğrulama',
        html: `
          <h2>Verxiel'e Hoş Geldiniz!</h2>
          <p>Email adresinizi doğrulamak için aşağıdaki kodu kullanın:</p>
          <h1 style="color: #a259e6; font-size: 32px; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 10px;">${emailCode}</h1>
          <p>Bu kod 10 dakika geçerlidir.</p>
          <p>Eğer bu işlemi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Bu email Verxiel uygulamasından gönderilmiştir.</p>
        `
      };
      
      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Email başarıyla gönderildi:', result.messageId);
    } catch (emailErr) {
      console.error('❌ Email gönderme hatası:', emailErr);
      console.error('Email gönderme detayları:', {
        email: email,
        code: emailCode,
        error: emailErr.message
      });
      // Email gönderilemese bile kullanıcıyı oluştur
    }
    
    res.status(201).json({ 
      message: 'Kayıt başarılı! Email adresinizi doğrulayın.', 
      user: { 
        id: user.id,
        email: user.email, 
        displayName: user.displayName, 
        username: user.username 
      } 
    });
  } catch (err) {
    console.error('EMAIL ERROR:', err);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: 'E-posta veya şifre hatalı!' });
    
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ message: 'E-posta veya şifre hatalı!' });
    
    // Email doğrulama kontrolü
    if (!user.verified) {
      return res.status(400).json({ 
        message: 'Email adresinizi doğrulamanız gerekiyor!', 
        needsVerification: true,
        email: user.email 
      });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl, id: user.id } });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

// E-posta doğrulama
exports.verifyEmail = async (req, res) => {
  const { email, code } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    if (user.verified) return res.status(400).json({ message: 'Zaten doğrulanmış' });
    if (user.emailCode !== code) return res.status(400).json({ message: 'Kod yanlış' });
    
    user.verified = true;
    user.emailCode = null;
    await user.save();
    
    // Doğrulama başarılı, token oluştur ve döndür
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      message: 'E-posta doğrulandı',
      token: token,
      user: { 
        email: user.email, 
        displayName: user.displayName, 
        avatarUrl: user.avatarUrl, 
        id: user.id 
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Doğrulama başarısız', error: err.message });
  }
};

// Kod yeniden gönder
exports.resendCode = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    if (user.verified) return res.status(400).json({ message: 'Zaten doğrulanmış' });
    
    // Yeni kod oluştur
    const emailCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailCode = emailCode;
    await user.save();
    
    // Email gönder
    try {
      console.log('Yeniden email gönderiliyor:', email);
      console.log('Yeni email kodu:', emailCode);
      
      const mailOptions = {
        from: '"Verxiel" <noreply@verxiel.app>',
        to: email,
        subject: 'Verxiel - Email Doğrulama Kodu',
        html: `
          <h2>Yeni Doğrulama Kodu</h2>
          <p>Email adresinizi doğrulamak için aşağıdaki kodu kullanın:</p>
          <h1 style="color: #a259e6; font-size: 32px; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 10px;">${emailCode}</h1>
          <p>Bu kod 10 dakika geçerlidir.</p>
          <p>Eğer bu işlemi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Bu email Verxiel uygulamasından gönderilmiştir.</p>
        `
      };
      
      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Yeniden email başarıyla gönderildi:', result.messageId);
      res.json({ message: 'Yeni kod gönderildi' });
    } catch (emailErr) {
      console.error('❌ Email gönderme hatası:', emailErr);
      console.error('Yeniden email gönderme detayları:', {
        email: email,
        code: emailCode,
        error: emailErr.message
      });
      res.status(500).json({ message: 'Kod gönderilemedi' });
    }
  } catch (err) {
    res.status(500).json({ message: 'İşlem başarısız', error: err.message });
  }
};

exports.me = async (req, res) => {
  const user = await User.findByPk(req.user.id, { attributes: { exclude: ['passwordHash'] } });
  res.json(user);
};

exports.updateProfile = async (req, res) => {
  const { displayName, avatarUrl } = req.body;
  const user = await User.findByPk(req.user.id);
  if (displayName) user.displayName = displayName;
  if (avatarUrl) user.avatarUrl = avatarUrl;
  await user.save();
  
  const userResponse = user.toJSON();
  delete userResponse.passwordHash;
  res.json(userResponse);
};

// Arkadaş ekle
exports.addContact = async (req, res) => {
  const { contactId } = req.body;
  if (!contactId) return res.status(400).json({ message: 'Eksik bilgi' });
  if (contactId == req.user.id) return res.status(400).json({ message: 'Kendini ekleyemezsin' });
  
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    
    const contacts = user.getContacts();
    if (contacts.includes(parseInt(contactId))) return res.status(400).json({ message: 'Zaten ekli' });
    
    contacts.push(parseInt(contactId));
    user.setContacts(contacts);
    await user.save();
    
    res.json({ message: 'Kişi eklendi', contacts: contacts });
  } catch (err) {
    res.status(500).json({ message: 'Kişi eklenemedi', error: err.message });
  }
};

// Email ile kişi ekle
exports.addContactByEmail = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email adresi gerekli' });
  
  try {
    const currentUser = await User.findByPk(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    
    const targetUser = await User.findOne({ where: { email } });
    if (!targetUser) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    if (targetUser.id === currentUser.id) return res.status(400).json({ message: 'Kendini ekleyemezsin' });
    
    const contacts = currentUser.getContacts();
    if (contacts.includes(targetUser.id)) return res.status(400).json({ message: 'Zaten ekli' });
    
    contacts.push(targetUser.id);
    currentUser.setContacts(contacts);
    await currentUser.save();
    
    res.json({ message: 'Kişi eklendi', contacts: contacts });
  } catch (err) {
    console.error('addContactByEmail error:', err);
    res.status(500).json({ message: 'Kişi eklenemedi', error: err.message });
  }
};

// Kişi listesini getir
exports.getContacts = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    
    const contactIds = user.getContacts();
    
    if (contactIds.length === 0) {
      return res.json([]);
    }
    
    const contacts = await User.findAll({
      where: { id: contactIds },
      attributes: ['id', 'displayName', 'email', 'avatarUrl', 'username']
    });
    
    res.json(contacts);
  } catch (err) {
    console.error('getContacts error:', err);
    res.status(500).json({ message: 'Kişiler alınamadı', error: err.message });
  }
};

// E-posta veya kullanıcı adı ile kullanıcı bul
exports.findUser = async (req, res) => {
  const { email, username } = req.query;
  if (!email && !username) return res.status(400).json({ message: 'E-posta veya kullanıcı adı gerekli' });
  
  try {
    const whereClause = email ? { email } : { username };
    const user = await User.findOne({ where: whereClause });
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Kullanıcı aranamadı', error: err.message });
  }
};

// Kullanıcıyı engelle
exports.blockUser = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: 'Eksik bilgi' });
  if (userId == req.user.id) return res.status(400).json({ message: 'Kendini engelleyemezsin' });
  
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    
    const blocked = user.getBlocked();
    if (!blocked.includes(parseInt(userId))) {
      blocked.push(parseInt(userId));
      user.setBlocked(blocked);
      await user.save();
    }
    
    res.json({ message: 'Kullanıcı engellendi', blocked: blocked });
  } catch (err) {
    res.status(500).json({ message: 'Engelleme başarısız', error: err.message });
  }
};

// Kullanıcının engelini kaldır
exports.unblockUser = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: 'Eksik bilgi' });
  
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    
    const blocked = user.getBlocked();
    const newBlocked = blocked.filter(id => id !== parseInt(userId));
    user.setBlocked(newBlocked);
    await user.save();
    
    res.json({ message: 'Kullanıcı engeli kaldırıldı', blocked: newBlocked });
  } catch (err) {
    res.status(500).json({ message: 'Engel kaldırma başarısız', error: err.message });
  }
};

// Kişi/chati sil
exports.deleteContact = async (req, res) => {
  const { contactId } = req.body;
  if (!contactId) return res.status(400).json({ message: 'Eksik bilgi' });
  
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    
    const contacts = user.getContacts();
    const newContacts = contacts.filter(id => id !== parseInt(contactId));
    user.setContacts(newContacts);
    await user.save();
    
    res.json({ message: 'Kişi silindi', contacts: newContacts });
  } catch (err) {
    res.status(500).json({ message: 'Kişi silinemedi', error: err.message });
  }
}; 