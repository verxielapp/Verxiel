# cPanel Backend Kurulum Rehberi

## 1. MySQL Veritabanı Oluşturma

1. cPanel'e giriş yap
2. **MySQL Databases** bölümüne git
3. Yeni bir database oluştur (örn: `verxiel_db`)
4. Yeni bir MySQL kullanıcısı oluştur (örn: `verxiel_user`)
5. Kullanıcıya database'e **ALL PRIVILEGES** ver
6. **Host:** `localhost` (genellikle)
7. Database adını, kullanıcı adını ve şifresini not et

## 2. Backend Dosyalarını Yükleme

1. Tüm `backend/` klasörünü FTP ile yükle
2. Önerilen yol: `public_html/api/` veya `public_html/backend/`
3. Dosya yapısı:
   ```
   public_html/
   └── api/
       ├── src/
       ├── package.json
       ├── node_modules/ (cPanel'de npm install yapılacak)
       └── ...
   ```

## 3. cPanel Node.js App Oluşturma

1. cPanel'de **Node.js App** bölümüne git
2. **Create Application** butonuna tıkla
3. Ayarlar:
   - **Node.js Version:** En son LTS sürümü (örn: 18.x veya 20.x)
   - **Application Mode:** Production
   - **Application Root:** `public_html/api` (backend klasörünün yolu)
   - **Application URL:** `/api` veya boş bırak (subdomain kullanacaksan)
   - **Application Startup File:** `src/index.js`
   - **Application Port:** Otomatik (cPanel ayarlayacak)

## 4. Environment Variables (Çok Önemli!)

cPanel Node.js App ayarlarında **Environment Variables** bölümüne git ve şunları ekle:

```
DB_HOST=localhost
DB_NAME=verxiel_db
DB_USER=verxiel_user
DB_PASSWORD=şifren_buraya
DB_PORT=3306
PORT=(cPanel otomatik ayarlayacak, elle değiştirme)
NODE_ENV=production
CORS_ORIGIN=https://verxiel.com,https://www.verxiel.com
JWT_SECRET=güçlü_bir_secret_key_buraya
SMTP_HOST=mail.verxiel.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=noreply@verxiel.com
EMAIL_PASSWORD=mail_hesabının_şifresi
```

**Önemli:**
- `DB_NAME`, `DB_USER`, `DB_PASSWORD` değerlerini MySQL Databases'den aldığın değerlerle doldur
- `JWT_SECRET` için güçlü bir random string oluştur (örn: `openssl rand -base64 32`)
- `CORS_ORIGIN` için frontend URL'ini ekle
- **Email Ayarları:**
  - `SMTP_HOST`: Genellikle `mail.verxiel.com` veya `localhost` (cPanel'de kontrol et)
  - `SMTP_PORT`: `587` (TLS) veya `465` (SSL) - cPanel'de hangisi açıksa
  - `SMTP_SECURE`: Port 465 ise `true`, 587 ise `false`
  - `EMAIL_USER`: `noreply@verxiel.com` (cPanel'de oluşturduğun mail hesabı)
  - `EMAIL_PASSWORD`: Mail hesabının şifresi

## 5. Dependencies Yükleme

1. cPanel Node.js App'te **NPM Install** butonuna tıkla
2. Veya SSH ile:
   ```bash
   cd public_html/api
   npm install
   ```

## 6. Uygulamayı Başlatma

1. cPanel Node.js App'te **Restart** butonuna tıkla
2. Logs'u kontrol et (hata var mı bak)
3. Eğer hata varsa, logları oku ve düzelt

## 7. API Endpoint'lerini Test Etme

Backend çalıştıktan sonra şu URL'leri test et:

- `https://verxiel.com/api/` → `{"status":"OK","message":"Verxiel Server is running"}`
- `https://verxiel.com/api/api/test` → `{"message":"API routes are working"}`

## 8. Frontend'i Backend'e Bağlama

Frontend'teki API base URL'ini güncelle:

```javascript
// Frontend'te API base URL
const API_BASE_URL = 'https://verxiel.com/api';
```

## 9. Sorun Giderme

### Database Connection Error
- MySQL credentials'ları kontrol et
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` doğru mu?
- MySQL kullanıcısının database'e erişim yetkisi var mı?

### Port Already in Use
- cPanel Node.js App'te PORT environment variable'ını kontrol et
- Başka bir Node.js App aynı portu kullanıyor olabilir

### Module Not Found
- `npm install` çalıştırıldı mı?
- `node_modules/` klasörü var mı?

### CORS Error
- `CORS_ORIGIN` environment variable'ında frontend URL'i var mı?
- Frontend ve backend aynı domain'de mi?

## 10. SSL/HTTPS

cPanel'de SSL sertifikası kurulu olmalı (Let's Encrypt ücretsiz). Backend HTTPS üzerinden çalışacak.

## Notlar

- Backend genellikle `/api` path'inde çalışır
- Frontend `/` path'inde çalışır
- Her ikisi de aynı domain'de olabilir (örn: `verxiel.com` ve `verxiel.com/api`)
- Veya subdomain kullanabilirsin (örn: `api.verxiel.com`)

