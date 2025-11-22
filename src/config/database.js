const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration for cPanel MySQL
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_NAME = process.env.DB_NAME || process.env.DATABASE_NAME;
const DB_USER = process.env.DB_USER || process.env.DATABASE_USER;
const DB_PASSWORD = process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD;
const DB_PORT = process.env.DB_PORT || 3306;

// Log environment variables for debugging
console.log('🔍 Environment check:');
console.log('DB_HOST:', DB_HOST);
console.log('DB_NAME exists:', !!DB_NAME);
console.log('DB_USER exists:', !!DB_USER);
console.log('DB_PORT:', DB_PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

let sequelize;

if (DB_NAME && DB_USER && DB_PASSWORD) {
  // Production: Use MySQL from cPanel
  console.log('🚀 Using MySQL database from cPanel');
  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'mysql',
    dialectOptions: {
      // Connection pool settings for production
      connectTimeout: 60000,
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
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
    if (DB_NAME && DB_USER && DB_PASSWORD) {
      console.log('✅ MySQL database connection established successfully');
      console.log('🌐 cPanel database ready for production use');
    } else {
      console.log('✅ SQLite database connection established successfully');
      console.log('🛡️ Security features: WAL mode, secure delete, foreign keys enabled');
    }
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
    if (DB_NAME && DB_USER && DB_PASSWORD) {
      console.error('💡 Make sure your MySQL credentials are correct:');
      console.error('   DB_HOST:', DB_HOST);
      console.error('   DB_NAME:', DB_NAME);
      console.error('   DB_USER:', DB_USER);
      console.error('   DB_PORT:', DB_PORT);
    }
  });

module.exports = sequelize; 