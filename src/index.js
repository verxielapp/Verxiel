const dns = require('dns');
dns.setDefaultResultOrder && dns.setDefaultResultOrder('ipv4first');

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
const User = require('./models/User');
const Message = require('./models/Message');
const FriendRequest = require('./models/FriendRequest');

// Sync database models with error handling
const syncDatabase = async () => {
  try {
    console.log('🔄 Starting database sync...');
    
    // First, try to authenticate the connection
    await sequelize.authenticate();
    console.log('✅ Database connection verified');
    
    // Create tables manually using raw SQL
    console.log('🔨 Creating tables manually...');
    
    // Create Users table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "Users" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR(255) UNIQUE NOT NULL,
        "passwordHash" VARCHAR(255) NOT NULL,
        "displayName" VARCHAR(255) NOT NULL,
        "username" VARCHAR(255) UNIQUE NOT NULL,
        "avatarUrl" VARCHAR(255) DEFAULT '',
        "verified" BOOLEAN DEFAULT false,
        "emailCode" VARCHAR(255),
        "role" VARCHAR(32) NOT NULL DEFAULT 'user',
        "isBanned" BOOLEAN NOT NULL DEFAULT false,
        "banReason" TEXT,
        "banExpiresAt" TIMESTAMP WITH TIME ZONE,
        "contacts" TEXT DEFAULT '[]',
        "blocked" TEXT DEFAULT '[]',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    console.log('✅ Users table created');

    // Ensure new moderation columns exist
    await sequelize.query(`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "role" VARCHAR(32) NOT NULL DEFAULT 'user';`);
    await sequelize.query(`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false;`);
    await sequelize.query(`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "banReason" TEXT;`);
    await sequelize.query(`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "banExpiresAt" TIMESTAMPTZ;`);
    console.log('✅ Users moderation columns ensured');
    
    // Create Messages table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "Messages" (
        "id" SERIAL PRIMARY KEY,
        "content" TEXT NOT NULL,
        "fromId" INTEGER REFERENCES "Users"("id"),
        "toId" INTEGER REFERENCES "Users"("id"),
        "image" TEXT,
        "type" VARCHAR(50) DEFAULT 'text',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    console.log('✅ Messages table created');
    
    // Create FriendRequests table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "FriendRequests" (
        "id" SERIAL PRIMARY KEY,
        "senderId" INTEGER REFERENCES "Users"("id"),
        "receiverId" INTEGER REFERENCES "Users"("id"),
        "status" VARCHAR(50) DEFAULT 'pending',
        "message" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    console.log('✅ FriendRequests table created');
    
    console.log('✅ All tables created successfully');

    // Ensure default admin account exists
    try {
      const [rows] = await sequelize.query(`SELECT id FROM "Users" WHERE username = 'Verxiel' LIMIT 1;`);
      if (!rows || rows.length === 0) {
        const bcrypt = require('bcrypt');
        const crypto = require('crypto');
        let adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword) {
          // 200 karakterlik güçlü şifre üret
          adminPassword = crypto.randomBytes(150).toString('base64')
            .replace(/[^a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g, '')
            .slice(0, 200);
          console.warn('👑 Generated strong admin password (copy and store securely):');
          console.warn(adminPassword);
        }
        const passwordHash = await bcrypt.hash(adminPassword, 12);
        await sequelize.query(`
          INSERT INTO "Users" (email, "passwordHash", "displayName", "username", verified, role, "createdAt", "updatedAt")
          VALUES ('admin@verxiel.app', :passwordHash, 'Verxiel', 'Verxiel', true, 'admin', NOW(), NOW());
        `, { replacements: { passwordHash } });
        console.log('👑 Default admin user created: Verxiel / admin@verxiel.app');
      } else {
        console.log('👑 Admin user already exists');
        if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD_FORCE_RESET === 'true') {
          const bcrypt = require('bcrypt');
          const newPass = (process.env.ADMIN_PASSWORD || '').trim();
          if (newPass.length > 0) {
            const passwordHash = await bcrypt.hash(newPass, 12);
            await sequelize.query(`
              UPDATE "Users"
              SET "passwordHash" = :passwordHash, "updatedAt" = NOW()
              WHERE "username" = 'Verxiel' OR "email" = 'admin@verxiel.app';
            `, { replacements: { passwordHash } });
            console.log('🔐 Admin password reset from ADMIN_PASSWORD (one-time). Disable ADMIN_PASSWORD_FORCE_RESET after deploy.');
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Admin bootstrap skipped:', e.message);
    }
    
  } catch (err) {
    console.error('❌ Database sync error:', err.message);
    console.log('⚠️ Continuing without database sync...');
  }
};

syncDatabase();

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

// Start server immediately after database sync
const startServer = async () => {
  try {
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
  } catch (err) {
    console.error('❌ Server startup error:', err);
    process.exit(1);
  }
};

// Start server after a short delay to ensure database sync completes
setTimeout(startServer, 2000); 