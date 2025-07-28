const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  avatarUrl: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  emailCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contacts: {
    type: DataTypes.TEXT, // JSON string
    defaultValue: '[]'
  },
  blocked: {
    type: DataTypes.TEXT, // JSON string
    defaultValue: '[]'
  }
}, {
  timestamps: true
});

// Helper methods
User.prototype.getContacts = function() {
  try {
    return JSON.parse(this.contacts || '[]');
  } catch {
    return [];
  }
};

User.prototype.setContacts = function(contacts) {
  this.contacts = JSON.stringify(contacts);
};

User.prototype.getBlocked = function() {
  try {
    return JSON.parse(this.blocked || '[]');
  } catch {
    return [];
  }
};

User.prototype.setBlocked = function(blocked) {
  this.blocked = JSON.stringify(blocked);
};

module.exports = User; 