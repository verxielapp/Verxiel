const User = require('./User');
const Message = require('./Message');

// User-Message ilişkileri
User.hasMany(Message, { as: 'sentMessages', foreignKey: 'fromId' });
User.hasMany(Message, { as: 'receivedMessages', foreignKey: 'toId' });

Message.belongsTo(User, { as: 'from', foreignKey: 'fromId' });
Message.belongsTo(User, { as: 'to', foreignKey: 'toId' });

module.exports = { User, Message }; 