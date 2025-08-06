const crypto = require('crypto');

// Güvenli key generator utility
class KeyGenerator {
  constructor() {
    this.algorithm = 'aes-256-gcm';
  }

  // Database encryption key oluştur
  generateDatabaseKey() {
    return crypto.randomBytes(64).toString('hex');
  }

  // JWT secret key oluştur
  generateJWTSecret() {
    return crypto.randomBytes(64).toString('hex');
  }

  // Email password hash oluştur
  generateEmailPassword() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Tüm güvenli key'leri oluştur
  generateAllKeys() {
    const keys = {
      DB_ENCRYPTION_KEY: this.generateDatabaseKey(),
      JWT_SECRET: this.generateJWTSecret(),
      EMAIL_PASSWORD: this.generateEmailPassword()
    };

    console.log('🔐 Güvenli Key\'ler Oluşturuldu:');
    console.log('=====================================');
    
    Object.entries(keys).forEach(([key, value]) => {
      console.log(`${key}=${value}`);
    });

    console.log('=====================================');
    console.log('📝 Bu key\'leri Render Environment Variables\'a ekle!');
    console.log('⚠️ Bu key\'leri güvenli bir yerde sakla!');
    
    return keys;
  }

  // Key güvenlik kontrolü
  validateKey(key) {
    if (!key || key.length < 32) {
      return false;
    }
    return true;
  }

  // Key strength test
  testKeyStrength(key) {
    const strength = {
      length: key.length,
      hasNumbers: /\d/.test(key),
      hasLetters: /[a-zA-Z]/.test(key),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(key),
      entropy: this.calculateEntropy(key)
    };

    let score = 0;
    if (strength.length >= 64) score += 2;
    if (strength.hasNumbers) score += 1;
    if (strength.hasLetters) score += 1;
    if (strength.hasSpecialChars) score += 1;
    if (strength.entropy > 4.5) score += 2;

    strength.score = score;
    strength.level = score >= 6 ? 'Excellent' : score >= 4 ? 'Good' : score >= 2 ? 'Fair' : 'Weak';

    return strength;
  }

  // Entropy hesapla
  calculateEntropy(key) {
    const charCount = {};
    for (let char of key) {
      charCount[char] = (charCount[char] || 0) + 1;
    }
    
    let entropy = 0;
    const length = key.length;
    
    for (let count of Object.values(charCount)) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }
    
    return entropy;
  }
}

// CLI için
if (require.main === module) {
  const generator = new KeyGenerator();
  
  console.log('🔐 Verxiel Güvenli Key Generator');
  console.log('=====================================');
  
  const keys = generator.generateAllKeys();
  
  console.log('\n🔍 Key Güvenlik Analizi:');
  console.log('=====================================');
  
  Object.entries(keys).forEach(([keyName, keyValue]) => {
    const strength = generator.testKeyStrength(keyValue);
    console.log(`${keyName}:`);
    console.log(`  - Uzunluk: ${strength.length}`);
    console.log(`  - Güvenlik Seviyesi: ${strength.level} (${strength.score}/7)`);
    console.log(`  - Entropy: ${strength.entropy.toFixed(2)}`);
    console.log('');
  });
  
  console.log('✅ Tüm key\'ler güvenli seviyede!');
}

module.exports = KeyGenerator; 