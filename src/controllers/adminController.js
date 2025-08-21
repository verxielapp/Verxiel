const User = require('../models/User');

exports.banUser = async (req, res) => {
  const { userId, reason, until } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId gerekli' });
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Admin banlanamaz' });

    user.isBanned = true;
    user.banReason = reason || null;
    user.banExpiresAt = until ? new Date(until) : null;
    await user.save();
    res.json({ message: 'Kullanıcı banlandı', userId: user.id, until: user.banExpiresAt });
  } catch (err) {
    res.status(500).json({ message: 'Ban işlemi başarısız', error: err.message });
  }
};

exports.unbanUser = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId gerekli' });
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    user.isBanned = false;
    user.banReason = null;
    user.banExpiresAt = null;
    await user.save();
    res.json({ message: 'Kullanıcı banı kaldırıldı', userId: user.id });
  } catch (err) {
    res.status(500).json({ message: 'Unban işlemi başarısız', error: err.message });
  }
};


