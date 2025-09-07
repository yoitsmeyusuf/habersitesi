# 📰 Haber Sitesi Backend

ASP.NET Core tabanlı haber sitesi backend uygulaması. Güvenlik, performans ve ölçeklenebilirlik odaklı tasarlanmıştır.

## 🚀 **Özellikler**

- **.NET 9** - En son .NET sürümü ile modern ve performanslı API.
- **PostgreSQL** - Güçlü ve açık kaynaklı ilişkisel veritabanı.
- **Entity Framework Core** - Modern ORM for .NET.
- **RESTful API** - Standartlara uygun API tasarımı.
- **JWT Authentication** - Güvenli ve stateless kimlik doğrulama.
- **Google OAuth 2.0** - Google ile güvenli giriş desteği.
- **Role-Based Authorization** - Kullanıcı ve Admin rolleri.
- **Push Notifications** - Web Push protokolü ile anlık bildirimler.
- **Rate Limiting** - API endpoint'leri için istek sınırlama.
- **Swagger/OpenAPI** - Otomatik API dokümantasyonu.

## 🛠️ **Teknolojiler**

- **Framework**: ASP.NET Core 9
- **Veritabanı**: PostgreSQL
- **ORM**: Entity Framework Core 9
- **Kimlik Doğrulama**: JWT (JSON Web Tokens) & Google OAuth 2.0
- **API Dokümantasyonu**: Swashbuckle (Swagger)
- **Şifreleme**: BCrypt.Net
- **Email**: MailKit
- **Push Bildirimleri**: WebPush
- **Yapılandırma**: DotNetEnv
- **Paket Yöneticisi**: NuGet

## 📦 **Kurulum**

### Gereksinimler

- .NET 9 SDK
- PostgreSQL

### Development

```bash
# Bağımlılıkları yükle
dotnet restore

# Veritabanı migration'larını uygula
dotnet ef database update

# Geliştirme sunucusunu başlat
dotnet run
```

## ⚙️ **Environment Variables**

Proje `DotNetEnv` kütüphanesini kullanarak `.env` dosyasından environment değişkenlerini okur. Gerekli değişkenler:

```env
# PostgreSQL Bağlantı Bilgisi
DB_CONNECTION_STRING="Host=localhost;Database=habersitesi;Username=postgres;Password=yourpassword"

# JWT Ayarları
JWT_SECRET="your_super_secret_jwt_key_with_at_least_32_characters"
JWT_ISSUER="your_issuer"
JWT_AUDIENCE="your_audience"

# Google OAuth Ayarları
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# VAPID Keys (Web Push Notifications)
VAPID_PUBLIC_KEY="your_vapid_public_key"
VAPID_PRIVATE_KEY="your_vapid_private_key"
VAPID_SUBJECT="mailto:your_email@example.com"

# E-posta Ayarları
EMAIL_HOST="smtp.example.com"
EMAIL_PORT=587
EMAIL_USERNAME="your_email_username"
EMAIL_PASSWORD="your_email_password"
```

## 🏗️ **Proje Yapısı**

```text
/
├── Controllers/        # API endpoint'leri
├── Services/           # İş mantığı servisleri
├── Models/             # Veritabanı varlıkları (entities)
├── Dtos/               # Data Transfer Objects
├── Migrations/         # EF Core veritabanı migration'ları
├── Middleware/         # Custom middleware'lar (örn: rate limiting)
├── Settings/           # Uygulama ayar sınıfları
├── Program.cs          # Uygulama giriş noktası ve servis konfigürasyonu
└── AppDbContext.cs     # Entity Framework Core DbContext
```

## 🔐 **Güvenlik**

- **Kimlik Doğrulama**: JWT ve Google OAuth ile güvenli API erişimi.
- **Yetkilendirme**: Roller (Admin, User) bazlı endpoint koruması.
- **Şifreleme**: `BCrypt.Net` ile kullanıcı parolalarının güvenli bir şekilde hash'lenmesi.
- **Rate Limiting**: `AspNetCoreRateLimit` ile brute-force ve DoS saldırılarına karşı koruma.
- **CORS**: Güvenli kaynak payaşımı için yapılandırılmış CORS politikası.
- **Secret Management**: Hassas veriler `.env` dosyası ve user secrets ile yönetilir.

## 🗄️ **Veritabanı Migration**

Entity Framework Core migration'ları ile veritabanı şeması yönetilir.

```bash
# Yeni bir migration oluşturma
dotnet ef migrations add InitialCreate

# Migration'ı veritabanına uygulama
dotnet ef database update
```

## 📄 **Lisans**

Bu proje MIT Lisansı altındadır. Detaylar için `LICENSE` dosyasına bakınız.
