# 📰 Haber Sitesi Frontend

Modern React tabanlı haber sitesi frontend uygulaması. Güvenlik, performans ve kullanıcı deneyimi odaklı tasarlanmıştır.

## 🚀 **Özellikler**

- ⚛️ **React 19** - Modern React hooks ve context
- ⚡ **Vite** - Hızlı geliştirme ve build
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🔒 **Güvenlik** - CSP, XSS koruması, input validation
- 📱 **PWA Ready** - Progressive Web App desteği
- 🔍 **SEO Optimized** - Meta tags, sitemap, robots.txt
- 🌐 **i18n Ready** - Türkçe dil desteği
- 📊 **Analytics** - Google Analytics entegrasyonu
- 🔐 **Authentication** - JWT + Google OAuth
- 📝 **Rich Editor** - CKEditor 5 entegrasyonu

## 🛠️ **Teknolojiler**

- **Frontend Framework**: React 19 + Vite
- **Styling**: Tailwind CSS + PostCSS
- **Router**: React Router v6
- **State Management**: Context API + useReducer
- **Editor**: CKEditor 5
- **Authentication**: JWT + Google OAuth
- **Build Tool**: Vite
- **Linting**: ESLint
- **Package Manager**: npm

## 📦 **Kurulum**

### Gereksinimler
- Node.js 18+ 
- npm 8+

### Development
```bash
# Dependency kurulumu
npm install

# Geliştirme sunucusu başlat
npm run dev

# Linting
npm run lint

# Build
npm run build
```

### Production
```bash
# Production build
npm run build:prod

# Production preview
npm run preview:prod

# Bundle analizi
npm run analyze
```

## ⚙️ **Environment Variables**

### Development (.env.development)
```bash
VITE_API_URL=http://localhost:5255/api
VITE_BASE_URL=http://localhost:5255
VITE_GOOGLE_CLIENT_ID=your-dev-google-client-id
```

### Production (.env.production)
```bash
VITE_API_URL=https://yourdomain.com/api
VITE_BASE_URL=https://yourdomain.com
VITE_GOOGLE_CLIENT_ID=your-prod-google-client-id
VITE_GA_ID=G-XXXXXXXXXX
```

## 🏗️ **Project Structure**

```
src/
├── components/         # React bileşenleri
│   ├── Auth/          # Authentication bileşenleri
│   ├── News/          # Haber bileşenleri
│   ├── Admin/         # Admin panel bileşenleri
│   └── Common/        # Ortak bileşenler
├── pages/             # Sayfa bileşenleri
├── services/          # API servisleri
├── contexts/          # React contexts
├── hooks/             # Custom hooks
├── utils/             # Utility fonksiyonları
├── assets/            # Statik dosyalar
└── tests/             # Test dosyaları
```

## 🔒 **Güvenlik**

- ✅ Content Security Policy (CSP)
- ✅ XSS Protection
- ✅ Input Validation & Sanitization
- ✅ CSRF Protection
- ✅ Rate Limiting
- ✅ Secure Headers
- ✅ File Upload Validation

## 📱 **PWA Features**

- ✅ Service Worker
- ✅ Web App Manifest
- ✅ Offline Support
- ✅ Push Notifications
- ✅ Install Prompt

## 🎯 **Performance**

- ✅ Code Splitting
- ✅ Lazy Loading
- ✅ Bundle Optimization
- ✅ Image Optimization
- ✅ Caching Strategy

## 🌐 **SEO**

- ✅ Meta Tags
- ✅ Open Graph
- ✅ Twitter Cards
- ✅ Structured Data
- ✅ Sitemap
- ✅ Robots.txt

## 📊 **Browser Support**

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚀 **Deployment**

### Netlify
```bash
# Build command
npm run build:prod

# Publish directory
dist
```

### Vercel
```bash
# Build command
npm run build:prod

# Output directory
dist
```

### Custom Server
```bash
# Build
npm run build:prod

# Serve dist/ folder
# Configure web server for SPA routing
```

## 📄 **License**

MIT License - Detaylar için LICENSE dosyasına bakın.

## 👥 **Contributing**

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**Haber Sitesi** - Türkiye'nin güvenilir haber kaynağı 🇹🇷
