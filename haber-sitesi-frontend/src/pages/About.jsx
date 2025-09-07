import React from 'react'
import SEOHead from '../components/SEOHead'
import { ConnectionStatus } from '../components/ErrorHandling'

const About = () => {
  return (
    <div className="bg-white min-h-screen">
      <ConnectionStatus />
      
      {/* SEO Head */}
      <SEOHead
        title="Hakkımızda - HaberSitesi"
        description="HaberSitesi hakkında detaylı bilgi. Misyonumuz, vizyonumuz ve ekibimiz hakkında her şey."
        keywords="hakkımızda, haber sitesi, misyon, vizyon, ekip"
        url={`${window.location.origin}/hakkimizda`}
      />

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-10 lg:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Hakkımızda
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Türkiye'nin en güncel ve güvenilir haber kaynağı olmak için çalışıyoruz
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 sm:space-y-12">
          {/* Misyon */}
          <section className="card p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              Misyonumuz
            </h2>
            <p className="text-gray-700 leading-relaxed text-base sm:text-lg">
              HaberSitesi olarak, Türkiye'de ve dünyada meydana gelen gelişmeleri tarafsız, doğru ve hızlı bir şekilde 
              okuyucularımıza ulaştırmayı amaçlıyoruz. Kaliteli gazetecilik ilkeleri doğrultusunda, toplumun bilgi 
              edinme hakkını destekleyerek demokratik değerlere katkıda bulunuyoruz.
            </p>
          </section>

          {/* Vizyon */}
          <section className="card p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              Vizyonumuz
            </h2>
            <p className="text-gray-700 leading-relaxed text-base sm:text-lg">
              Dijital çağın gereksinimlerine uygun, teknoloji ile harmanlanan modern gazetecilik anlayışıyla, 
              Türkiye'nin en çok tercih edilen haber platformu olmak. İnovatif yaklaşımlarımızla okuyucu 
              deneyimini sürekli geliştirerek, habercilikte yeni standartlar belirlemek.
            </p>
          </section>

          {/* Değerlerimiz */}
          <section className="card p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              Değerlerimiz
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Tarafsızlık</h3>
                    <p className="text-gray-600 text-sm">Objektif habercilik anlayışı</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Doğruluk</h3>
                    <p className="text-gray-600 text-sm">Kontrollü ve güvenilir bilgi</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Hızlılık</h3>
                    <p className="text-gray-600 text-sm">Güncel ve zamanında haber</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Şeffaflık</h3>
                    <p className="text-gray-600 text-sm">Açık ve hesap verebilir yapı</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Ekip */}
          <section className="card p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              Ekibimiz
            </h2>
            <p className="text-gray-700 leading-relaxed text-base sm:text-lg mb-6">
              Deneyimli gazeteciler, editörler ve teknisyenlerden oluşan profesyonel ekibimizle, 
              7/24 esasına dayalı haber üretimi gerçekleştiriyoruz. Farklı uzmanlık alanlarından 
              editörlerimiz sayesinde her konuda derinlemesine analiz sunuyoruz.
            </p>
            <div className="bg-gradient-to-r from-primary-50 to-accent-50 p-4 rounded-lg border border-primary-100">
              <p className="text-primary-700 font-medium text-center">
                📧 Ekibimize katılmak istiyorsanız: <a href="/iletisim" className="underline hover:text-primary-800">iletişim sayfamızı</a> ziyaret edin
              </p>
            </div>
          </section>

          {/* İletişim CTA */}
          <section className="text-center py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Sorularınız mı var?
            </h2>
            <p className="text-gray-600 mb-6">
              Bizimle iletişime geçmekten çekinmeyin
            </p>
            <a 
              href="/iletisim"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl hover:from-primary-600 hover:to-accent-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              İletişime Geç
            </a>
          </section>
        </div>
      </div>
    </div>
  )
}

export default About
