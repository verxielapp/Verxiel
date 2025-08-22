const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user', // 'user' | 'admin'
    allowNull: false
  },
  isBanned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  banReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  banExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true
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
    defaultValue: '[]',
    get() {
      try {
        const contacts = JSON.parse(this.getDataValue('contacts') || '[]');
        return Array.isArray(contacts) ? contacts : [];
      } catch (error) {
        console.error('Error parsing contacts:', error);
        return [];
      }
    },
    set(value) {
      try {
        const contactsArray = Array.isArray(value) ? value : [];
        this.setDataValue('contacts', JSON.stringify(contactsArray));
        console.log('Contacts set successfully:', contactsArray);
      } catch (error) {
        console.error('Error setting contacts:', error);
        this.setDataValue('contacts', '[]');
      }
    }
  },
  blocked: {
    type: DataTypes.TEXT, // JSON string
    defaultValue: '[]',
    get() {
      try {
        const blocked = JSON.parse(this.getDataValue('blocked') || '[]');
        return Array.isArray(blocked) ? blocked : [];
      } catch (error) {
        console.error('Error parsing blocked:', error);
        return [];
      }
    },
    set(value) {
      try {
        const blockedArray = Array.isArray(value) ? value : [];
        this.setDataValue('blocked', JSON.stringify(blockedArray));
        console.log('Blocked set successfully:', blockedArray);
      } catch (error) {
        console.error('Error setting blocked:', error);
        this.setDataValue('blocked', '[]');
      }
    }
  }
}, {
  tableName: 'Users', // Tablo adını Users olarak belirt
  timestamps: true
});

module.exports = User; 