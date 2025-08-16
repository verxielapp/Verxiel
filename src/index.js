const express = require('express');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const chatSocket = require('./sockets/chat');
const sequelize = require('./config/database');
const dbSecurity = require('./utils/databaseSecurity');

// Model ilişkilerini yükle
require('./models/associations');

const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/message');
const friendRequestRoutes = require('./routes/friendRequest');
const qrRoutes = require('./routes/qr');

const app = express();
const PORT = process.env.PORT || 10000;

// Database synchronization - create tables if they don't exist
const sequelize = require('./config/database');
const User = require('./models/User');
const Message = require('./models/Message');
const FriendRequest = require('./models/FriendRequest');

// Sync database models
sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ Database tables synchronized successfully');
    console.log('📊 Tables created/updated: User, Message, FriendRequest');
  })
  .catch(err => {
    console.error('❌ Database sync error:', err);
  });

const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [
    'http://localhost:3000',
    'https://verxiel.netlify.app',
    'https://verxiel.onrender.com'
  ],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Verxiel Server is running',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint - en üstte olmalı
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Diğer route'lar
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/friend-requests', friendRequestRoutes);
app.use('/api/qr', qrRoutes); // QR route'larını ayrı path'e taşı

// Test endpoint'i - route'ların çalışıp çalışmadığını kontrol et
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API routes are working',
    authRoutes: !!authRoutes,
    messageRoutes: !!messageRoutes,
    qrRoutes: !!qrRoutes,
    database: 'Connected',
    timestamp: new Date().toISOString()
  });
});

// Database health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ 
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test mesajları oluştur
app.post('/api/test-messages', async (req, res) => {
  try {
    const Message = require('./models/Message');
    const User = require('./models/User');
    
    // Test kullanıcıları oluştur
    const user1 = await User.create({
      email: 'test1@test.com',
      passwordHash: 'test',
      displayName: 'Test User 1',
      username: 'testuser1'
    });
    
    const user2 = await User.create({
      email: 'test2@test.com',
      passwordHash: 'test',
      displayName: 'Test User 2',
      username: 'testuser2'
    });
    
    // Test mesajları oluştur
    await Message.create({
      fromId: user1.id,
      toId: user2.id,
      content: 'Merhaba! Bu bir test mesajıdır.',
      timestamp: Date.now()
    });
    
    await Message.create({
      fromId: user2.id,
      toId: user1.id,
      content: 'Merhaba! Ben de test mesajı gönderiyorum.',
      timestamp: Date.now()
    });
    
    res.json({
      message: 'Test messages created',
      user1: user1.id,
      user2: user2.id
    });
  } catch (error) {
    console.error('Error creating test messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Token doğrulama test endpoint'i
app.get('/api/verify-token', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ 
      message: 'No token provided',
      valid: false 
    });
  }
  
  const token = auth.split(' ')[1];
  if (!token) {
    return res.status(401).json({ 
      message: 'Invalid token format',
      valid: false 
    });
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'verxiel_secret';
    const decoded = jwt.verify(token, JWT_SECRET);
    
    res.json({ 
      message: 'Token is valid',
      valid: true,
      user: decoded,
      secret: JWT_SECRET ? 'JWT_SECRET is set' : 'JWT_SECRET is not set'
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ 
      message: 'Invalid token',
      valid: false,
      error: error.message
    });
  }
});

// Environment variables kontrol endpoint'i
app.get('/api/env-check', (req, res) => {
  res.json({
    JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
    EMAIL_USER: process.env.EMAIL_USER ? 'SET' : 'NOT SET',
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'DEFAULT',
    PORT: process.env.PORT || 10000,
    DB_ENCRYPTION_KEY: process.env.DB_ENCRYPTION_KEY ? 'SET' : 'NOT SET'
  });
});

// Database security status endpoint
app.get('/api/db-security', (req, res) => {
  const status = dbSecurity.getSecurityStatus();
  res.json({
    message: 'Database security status',
    status: status,
    timestamp: new Date().toISOString()
  });
});

// Database backup endpoint (admin only)
app.post('/api/db-backup', async (req, res) => {
  try {
    const backupPath = await dbSecurity.createBackup();
    if (backupPath) {
      res.json({
        message: 'Database backup created successfully',
        backupPath: backupPath,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        message: 'Failed to create database backup',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Backup endpoint error:', error);
    res.status(500).json({
      message: 'Backup creation failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database integrity check endpoint
app.get('/api/db-integrity', async (req, res) => {
  try {
    const isValid = await dbSecurity.validateDatabaseIntegrity();
    res.json({
      message: 'Database integrity check',
      isValid: isValid,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Integrity check error:', error);
    res.status(500).json({
      message: 'Integrity check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
chatSocket(io);

// SQLite database bağlantısı ve tablo oluşturma
sequelize.sync({ force: false }).then(async () => {
  console.log('✅ SQLite database connected and tables created');
  
  // Database security checks
  const securityStatus = dbSecurity.getSecurityStatus();
  console.log('🔐 Database security status:', securityStatus);
  
  // Validate database integrity
  const isValid = await dbSecurity.validateDatabaseIntegrity();
  if (!isValid) {
    console.log('⚠️ Database integrity check failed');
  }
  
  // Setup automatic backup (if enabled)
  if (process.env.DB_BACKUP_ENABLED === 'true') {
    setInterval(async () => {
      await dbSecurity.createBackup();
      await dbSecurity.cleanOldBackups();
    }, parseInt(process.env.DB_BACKUP_INTERVAL) || 86400000); // Default: 24 hours
    
    console.log('💾 Automatic database backup enabled');
  }
  
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('🛡️ Database encryption and security features active');
  });
}).catch(err => {
  console.error('❌ Database connection error:', err);
}); 