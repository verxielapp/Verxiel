const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration for cPanel MySQL
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_NAME = process.env.DB_NAME || process.env.DATABASE_NAME;
const DB_USER = process.env.DB_USER || process.env.DATABASE_USER;
const DB_PASSWORD = process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD;
const DB_PORT = process.env.DB_PORT || 3306;
const DB_SOCKET = process.env.DB_SOCKET || '/tmp/mysql.sock';

// Log environment variables for debugging
console.log('🔍 Environment check:');
console.log('DB_HOST:', DB_HOST);
console.log('DB_NAME:', DB_NAME || 'NOT SET');
console.log('DB_USER:', DB_USER || 'NOT SET');
console.log('DB_PASSWORD:', DB_PASSWORD ? '***SET***' : 'NOT SET');
console.log('DB_PORT:', DB_PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

let sequelize;

if (DB_NAME && DB_USER && DB_PASSWORD) {
  // Production: Use MySQL from cPanel
  console.log('🚀 Using MySQL database from cPanel');
  console.log('📋 Connection details:');
  console.log('   Host:', DB_HOST);
  console.log('   Database:', DB_NAME);
  console.log('   User:', DB_USER);
  console.log('   Port:', DB_PORT);
  
  // Try different connection configurations for cPanel
  // Use socket path if available (works better on some cPanel servers)
  const useSocket = DB_SOCKET && DB_SOCKET !== 'false' && DB_SOCKET !== '';
  
  const connectionConfig = {
    dialect: 'mysql',
    dialectOptions: {
      connectTimeout: 60000,
      multipleStatements: true,
      // Try different authentication methods
      authPlugins: {
        mysql_native_password: () => () => Buffer.from(DB_PASSWORD + '\0')
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: false,
    define: {
      freezeTableName: true,
      timestamps: true,
      paranoid: false
    },
    retry: {
      max: 3
    },
    // Additional options for cPanel compatibility
    reconnect: true
  };

  // If socket path is set, use it; otherwise use host/port
  if (useSocket) {
    // Normalize socket path (ensure it starts with /)
    const socketPath = DB_SOCKET.startsWith('/') ? DB_SOCKET : '/' + DB_SOCKET;
    connectionConfig.dialectOptions.socketPath = socketPath;
    console.log('🔌 Using MySQL socket:', socketPath);
  } else {
    connectionConfig.host = DB_HOST;
    connectionConfig.port = DB_PORT;
    console.log('🌐 Using MySQL host/port:', DB_HOST, DB_PORT);
  }

  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, connectionConfig);
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