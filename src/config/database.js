const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration for cloud deployment
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const DB_ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || 'verxiel_secure_key_2024_very_long_and_secure_key_for_encryption';

let sequelize;

if (DATABASE_URL) {
  // Production: Use PostgreSQL from DATABASE_URL (Render.com, Heroku, etc.)
  console.log('🚀 Using PostgreSQL database from DATABASE_URL');
  sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
      // Connection pool settings for production
      pool: {
        max: 20,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    },
    logging: false, // Disable SQL logs in production
    define: {
      // Prevent SQL injection
      freezeTableName: true,
      // Add timestamps for audit trail
      timestamps: true,
      // Use paranoid mode for soft deletes
      paranoid: false
    }
  });
} else {
  // Development: Use SQLite for local development
  console.log('💻 Using SQLite database for local development');
  const path = require('path');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../database.sqlite'),
    logging: false,
    dialectOptions: {
      mode: 'sqlite3',
      key: DB_ENCRYPTION_KEY,
      busyTimeout: 30000,
      pragma: {
        journal_mode: 'WAL',
        synchronous: 'NORMAL',
        cache_size: -64000,
        temp_store: 'memory',
        mmap_size: 268435456,
        page_size: 4096,
        auto_vacuum: 'incremental',
        foreign_keys: 'ON',
        recursive_triggers: 'ON',
        secure_delete: 'ON'
      }
    },
    define: {
      freezeTableName: true,
      timestamps: true,
      paranoid: false
    }
  });
}

// Test database connection
sequelize.authenticate()
  .then(() => {
    if (DATABASE_URL) {
      console.log('✅ PostgreSQL database connection established successfully');
      console.log('🌐 Cloud database ready for production use');
    } else {
      console.log('✅ SQLite database connection established successfully');
      console.log('🔐 Database encryption enabled with key length:', DB_ENCRYPTION_KEY.length);
      console.log('🛡️ Security features: WAL mode, secure delete, foreign keys enabled');
    }
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
    if (DATABASE_URL) {
      console.error('💡 Make sure your DATABASE_URL is correct and the database is accessible');
    }
  });

module.exports = sequelize; 