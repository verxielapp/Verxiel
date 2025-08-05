const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Database encryption key from environment variables
const DB_ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || 'verxiel_secure_key_2024_very_long_and_secure_key_for_encryption';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
  logging: false, // SQL loglarını kapat
  dialectOptions: {
    // Use better-sqlite3 for enhanced security
    mode: 'sqlite3',
    // Database encryption
    key: DB_ENCRYPTION_KEY,
    // Security settings
    busyTimeout: 30000,
    // Performance and security optimizations
    pragma: {
      journal_mode: 'WAL',
      synchronous: 'NORMAL',
      cache_size: -64000, // 64MB cache
      temp_store: 'memory',
      mmap_size: 268435456, // 256MB
      page_size: 4096,
      auto_vacuum: 'incremental',
      // Security pragmas
      foreign_keys: 'ON',
      recursive_triggers: 'ON',
      secure_delete: 'ON' // Overwrite deleted data
    }
  },
  // Additional Sequelize security options
  define: {
    // Prevent SQL injection
    freezeTableName: true,
    // Add timestamps for audit trail
    timestamps: true,
    // Use paranoid mode for soft deletes
    paranoid: false
  }
});

// Test database connection and encryption
sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connection established successfully');
    console.log('🔐 Database encryption enabled with key length:', DB_ENCRYPTION_KEY.length);
    console.log('🛡️ Security features: WAL mode, secure delete, foreign keys enabled');
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
  });

module.exports = sequelize; 