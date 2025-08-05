# Verxiel - Modern Mesajlaşma Uygulaması

Güvenli, hızlı ve modern mesajlaşma deneyimi sunan web uygulaması. QR kod ile kolay giriş, sesli ve görüntülü arama özellikleri ile kullanıcı dostu bir chat platformu.

## 🚀 Özellikler

- **Güvenli Mesajlaşma:** End-to-end şifreleme ile güvenli iletişim
- **QR Kod Girişi:** Hızlı ve kolay giriş sistemi
- **Sesli/Görüntülü Arama:** WebRTC teknolojisi ile kaliteli arama
- **Modern UI/UX:** Responsive ve kullanıcı dostu arayüz
- **Real-time Mesajlaşma:** Socket.io ile anlık mesajlaşma
- **Kişi Yönetimi:** Kolay kişi ekleme ve yönetimi

## 🛠️ Teknolojiler

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **Socket.io** - Real-time communication
- **Sequelize** - Database ORM
- **SQLite** - Database
- **JWT** - Authentication
- **WebRTC** - Voice/Video calls

### Frontend
- **React.js** - UI framework
- **Socket.io-client** - Real-time client
- **Axios** - HTTP client
- **CSS3** - Styling

## 📦 Kurulum

### Backend Kurulumu

```bash
# Repository'yi klonlayın
git clone https://github.com/yourusername/verxiel.git
cd verxiel

# Bağımlılıkları yükleyin
npm install

# Environment variables'ları ayarlayın
cp .env.example .env
# .env dosyasını düzenleyin

# Veritabanını başlatın
npm run db:migrate

# Sunucuyu başlatın
npm start
```

### Frontend Kurulumu

```bash
cd frontend
npm install
npm start
```

## 🔧 Environment Variables

```env
# Server
PORT=10000
NODE_ENV=production

# Database
DB_ENCRYPTION_KEY=your_encryption_key

# JWT
JWT_SECRET=your_jwt_secret

# Email (Opsiyonel)
EMAIL_USER=your_email
EMAIL_PASSWORD=your_password

# CORS
CORS_ORIGIN=https://verxiel.netlify.app
```

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi
- `POST /api/auth/verify-email` - Email doğrulama

### Messages
- `GET /api/messages` - Mesajları getir
- `POST /api/messages` - Mesaj gönder

### QR Code
- `GET /api/qr/generate` - QR kod oluştur
- `POST /api/qr/verify` - QR kod doğrula

## 🔒 Güvenlik

- **JWT Authentication** - Güvenli token tabanlı kimlik doğrulama
- **Database Encryption** - Veritabanı şifreleme
- **CORS Protection** - Cross-origin resource sharing koruması
- **Input Validation** - Giriş verisi doğrulama
- **Rate Limiting** - API rate limiting

## 🌐 Deployment

### Backend (Render)
```bash
# Render.com'da deploy edin
# Environment variables'ları ayarlayın
# Build command: npm install
# Start command: npm start
```

### Frontend (Netlify)
```bash
# Netlify'da deploy edin
# Build command: npm run build
# Publish directory: build
```

## 📊 SEO Optimizasyonu

- **Meta Tags** - Open Graph, Twitter Cards
- **Sitemap.xml** - Search engine indexing
- **Robots.txt** - Crawler directives
- **Google Analytics** - Traffic tracking
- **Structured Data** - Rich snippets

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın.

## 📞 İletişim

- **Website:** https://verxiel.netlify.app
- **Email:** contact@verxiel.com
- **GitHub:** https://github.com/yourusername/verxiel

## 🙏 Teşekkürler

Bu projeyi mümkün kılan tüm açık kaynak topluluğuna teşekkürler.

---

**Not:** Node modules dahil değildir, `npm install` komutu ile yükleyin.
