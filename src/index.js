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
const qrRoutes = require('./routes/qr');

const app = express();
const PORT = process.env.PORT || 10000;

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
app.use('/api/qr', qrRoutes); // QR route'larını ayrı path'e taşı

// Test endpoint'i - route'ların çalışıp çalışmadığını kontrol et
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API routes are working',
    authRoutes: !!authRoutes,
    messageRoutes: !!messageRoutes,
    qrRoutes: !!qrRoutes
  });
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
    PORT: process.env.PORT || 10000
  });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
chatSocket(io);

// SQLite database bağlantısı ve tablo oluşturma
sequelize.sync({ force: false }).then(() => {
  console.log('SQLite database connected and tables created');
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('Database connection error:', err);
}); 