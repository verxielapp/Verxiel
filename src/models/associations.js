const User = require('./User');
const Message = require('./Message');
const FriendRequest = require('./FriendRequest');

// User-Message ilişkileri
User.hasMany(Message, { as: 'sentMessages', foreignKey: 'fromId' });
User.hasMany(Message, { as: 'receivedMessages', foreignKey: 'toId' });

Message.belongsTo(User, { as: 'from', foreignKey: 'fromId' });
Message.belongsTo(User, { as: 'to', foreignKey: 'toId' });

// User-FriendRequest ilişkileri
User.hasMany(FriendRequest, { as: 'sentRequests', foreignKey: 'senderId' });
User.hasMany(FriendRequest, { as: 'receivedRequests', foreignKey: 'receiverId' });

FriendRequest.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
FriendRequest.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });

module.exports = { User, Message, FriendRequest }; 