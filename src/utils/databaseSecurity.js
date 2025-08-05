const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database Security Utilities
class DatabaseSecurity {
  constructor() {
    this.encryptionKey = process.env.DB_ENCRYPTION_KEY || this.generateSecureKey();
    this.databasePath = path.join(__dirname, '../../database.sqlite');
    this.backupPath = path.join(__dirname, '../../backups/');
  }

  // Generate a secure encryption key
  generateSecureKey() {
    return crypto.randomBytes(64).toString('hex');
  }

  // Encrypt sensitive data before storing
  encryptData(data) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex')
    };
  }

  // Decrypt sensitive data
  decryptData(encryptedData) {
    try {
      const algorithm = 'aes-256-gcm';
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const decipher = crypto.createDecipher(algorithm, key);
      
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
      decipher.setAAD(Buffer.from(encryptedData.iv, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }

  // Hash sensitive user data
  hashSensitiveData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Create database backup
  async createBackup() {
    try {
      if (!fs.existsSync(this.backupPath)) {
        fs.mkdirSync(this.backupPath, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `database_backup_${timestamp}.sqlite`;
      const backupFilePath = path.join(this.backupPath, backupFileName);

      if (fs.existsSync(this.databasePath)) {
        fs.copyFileSync(this.databasePath, backupFilePath);
        console.log(`✅ Database backup created: ${backupFileName}`);
        return backupFilePath;
      } else {
        console.log('⚠️ Database file not found, skipping backup');
        return null;
      }
    } catch (error) {
      console.error('❌ Backup creation error:', error);
      return null;
    }
  }

  // Clean old backups (keep last 7 days)
  async cleanOldBackups() {
    try {
      if (!fs.existsSync(this.backupPath)) return;

      const files = fs.readdirSync(this.backupPath);
      const now = Date.now();
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

      files.forEach(file => {
        const filePath = path.join(this.backupPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < sevenDaysAgo) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted old backup: ${file}`);
        }
      });
    } catch (error) {
      console.error('❌ Backup cleanup error:', error);
    }
  }

  // Validate database integrity
  async validateDatabaseIntegrity() {
    try {
      if (!fs.existsSync(this.databasePath)) {
        console.log('⚠️ Database file not found');
        return false;
      }

      const stats = fs.statSync(this.databasePath);
      const fileSize = stats.size;
      
      if (fileSize === 0) {
        console.log('⚠️ Database file is empty');
        return false;
      }

      console.log(`✅ Database integrity check passed (${fileSize} bytes)`);
      return true;
    } catch (error) {
      console.error('❌ Database integrity check failed:', error);
      return false;
    }
  }

  // Get security status
  getSecurityStatus() {
    return {
      encryptionEnabled: !!this.encryptionKey,
      keyLength: this.encryptionKey.length,
      databaseExists: fs.existsSync(this.databasePath),
      backupEnabled: process.env.DB_BACKUP_ENABLED === 'true',
      environment: process.env.NODE_ENV || 'development'
    };
  }
}

module.exports = new DatabaseSecurity(); 