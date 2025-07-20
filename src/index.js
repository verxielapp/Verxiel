const express = require('express');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const chatSocket = require('./sockets/chat');
const sequelize = require('./config/database');

const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/message');

const app = express();
const PORT = process.env.PORT || 8790;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

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