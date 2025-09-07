# 📰 Haber Sitesi Projesi

Bu proje, modern teknolojiler kullanılarak geliştirilmiş tam teşekküllü bir haber sitesi uygulamasıdır. Proje, bir React tabanlı frontend ve bir ASP.NET Core tabanlı backend olmak üzere iki ana bölümden oluşmaktadır.

## 📂 Proje Yapısı

Proje iki ana klasör altında organize edilmiştir:

-   `haber-sitesi-frontend/`: React ile geliştirilen kullanıcı arayüzü uygulaması.
-   `habersitesi-backend/`: ASP.NET Core ile geliştirilen API ve sunucu mantığı.

Her bir bölümün kendi `README.md` dosyası bulunmaktadır ve kurulum, yapılandırma ve dağıtım hakkında detaylı bilgiler içerir.

---

## Frontend (`haber-sitesi-frontend`)

Kullanıcıların haberleri okuyabildiği, yorum yapabildiği ve site ile etkileşime girebildiği modern, hızlı ve SEO dostu bir arayüz.

-   **Teknolojiler**: React 19, Vite, Tailwind CSS, React Router.
-   **Detaylı Bilgi**: [Frontend README](./haber-sitesi-frontend/README.md)

## Backend (`habersitesi-backend`)

İçerik yönetimi, kullanıcı kimlik doğrulaması, API servisleri ve veritabanı işlemlerini yürüten güçlü ve ölçeklenebilir sunucu uygulaması.

-   **Teknolojiler**: ASP.NET Core 9, PostgreSQL, Entity Framework Core, JWT.
-   **Detaylı Bilgi**: [Backend README](./habersitesi-backend/README.md)

## 🚀 Genel Bakış

Bu monorepo yapısı, frontend ve backend kod tabanlarını ayrı ayrı yönetmeyi kolaylaştırırken, projenin bütünsel olarak geliştirilmesine olanak tanır. Her bir bölümün kendi bağımlılıkları, testleri ve dağıtım süreçleri bulunmaktadır.

Daha fazla teknik ayrıntı, kurulum adımları ve yapılandırma bilgileri için lütfen ilgili klasörlerdeki `README.md` dosyalarını inceleyin.
