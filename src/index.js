const express = require('express');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const chatSocket = require('./sockets/chat');
const sequelize = require('./config/database');

const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/message');
const qrRoutes = require('./routes/qr');

const app = express();
const PORT = process.env.PORT || 8790;

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