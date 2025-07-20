const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'verxiel_secret';

// GMAIL SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: process.env.ETHEREAL_USER,
    pass: process.env.ETHEREAL_PASS
  }
});

function validateEmail(email) {
  const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  return re.test(email);
}

exports.register = async (req, res) => {
  const { email, password, displayName, username } = req.body;
  try {
    if (!validateEmail(email)) return res.status(400).json({ message: 'Geçersiz e-posta formatı' });
    
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: 'Email already in use' });
    
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) return res.status(400).json({ message: 'Username already in use' });
    
    const passwordHash = await bcrypt.hash(password, 10);
    // E-posta doğrulama kodu üret
    const emailCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const user = await User.create({ 
      email, 
      passwordHash, 
      displayName, 
      username, 
      verified: false, 
      emailCode 
    });
    
    // E-posta gönder
    await transporter.sendMail({
      from: 'no-reply@verxiel.com',
      to: email,
      subject: 'Verxiel E-posta Doğrulama',
      text: `Doğrulama kodunuz: ${emailCode}`
    });
    console.log('DEBUG: Doğrulama kodu:', emailCode, '->', email);
    res.status(201).json({ message: 'Kayıt başarılı, e-posta doğrulama kodu gönderildi', user: { email, displayName, username } });
  } catch (err) {
    console.error('EMAIL ERROR:', err);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    
    // Geçici olarak e-posta doğrulama kontrolünü kaldır
    // if (!user.verified) return res.status(400).json({ message: 'E-posta doğrulanmamış. Lütfen e-posta adresinizi doğrulayın.' });
    
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl, _id: user.id } });
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
    res.json({ message: 'E-posta doğrulandı' });
  } catch (err) {
    res.status(500).json({ message: 'Doğrulama başarısız', error: err.message });
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

// Kişi listesini getir
exports.getContacts = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const contactIds = user.getContacts();
    
    if (contactIds.length === 0) {
      return res.json([]);
    }
    
    const contacts = await User.findAll({
      where: { id: contactIds },
      attributes: ['id', 'displayName', 'email', 'avatarUrl']
    });
    
    res.json(contacts);
  } catch (err) {
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