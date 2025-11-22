// Test MySQL connection directly
require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_PORT = parseInt(process.env.DB_PORT || '3306');

console.log('🧪 Testing MySQL Connection...');
console.log('Host:', DB_HOST);
console.log('Database:', DB_NAME);
console.log('User:', DB_USER);
console.log('Password:', DB_PASSWORD ? '***SET***' : 'NOT SET');
console.log('Port:', DB_PORT);
console.log('');

// Try different connection methods
const testConnections = [
  { host: DB_HOST, port: DB_PORT },
  { host: '127.0.0.1', port: DB_PORT },
  { host: 'localhost', port: DB_PORT, socketPath: '/tmp/mysql.sock' },
  { host: 'localhost', port: DB_PORT }
];

async function testConnection(config) {
  try {
    console.log(`🔄 Trying: ${config.host}:${config.port}${config.socketPath ? ' (socket)' : ''}...`);
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      socketPath: config.socketPath,
      connectTimeout: 10000
    });
    
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ SUCCESS! Connection works with:', config);
    console.log('   Test query result:', rows);
    await connection.end();
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.message);
    return false;
  }
}

async function runTests() {
  for (const config of testConnections) {
    const success = await testConnection(config);
    if (success) {
      console.log('\n🎉 Working configuration found!');
      console.log('Use these environment variables:');
      console.log(`DB_HOST=${config.host}`);
      console.log(`DB_PORT=${config.port}`);
      if (config.socketPath) {
        console.log(`DB_SOCKET=${config.socketPath}`);
      }
      process.exit(0);
    }
    console.log('');
  }
  
  console.log('❌ All connection attempts failed!');
  console.log('\n💡 Possible solutions:');
  console.log('1. Check MySQL credentials in cPanel');
  console.log('2. Verify user has access from localhost');
  console.log('3. Check if MySQL is running');
  console.log('4. Contact cPanel support');
  process.exit(1);
}

runTests();

