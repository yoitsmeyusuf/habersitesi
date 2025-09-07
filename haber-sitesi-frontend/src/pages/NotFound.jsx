import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'
import { ConnectionStatus } from '../components/ErrorHandling'
import { trackPageView } from '../utils/analytics'

const NotFound = () => {
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setMounted(true)
    // Enhanced analytics tracking
    trackPageView('/404', '404 - Sayfa Bulunamadı')
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_not_found', {
        page_location: window.location.href,
        page_title: document.title
      })
    }
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchTerm.trim())}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4">
      <ConnectionStatus />
      
      {/* Enhanced SEO Head */}
      <SEOHead
        title="404 - Sayfa Bulunamadı | Güncel Haberler"
        description="Aradığınız sayfa bulunamadı. Ana sayfaya dönün, arama yapın veya popüler kategorileri inceleyin. 7/24 güncel haber kaynağı."
        keywords="404, sayfa bulunamadı, hata, ana sayfa, haber arama"
        url={`${window.location.origin}/404`}
        canonicalUrl={`${window.location.origin}/404`}
        noindex={true}
      />

      <div className="max-w-3xl mx-auto text-center">
        {/* Enhanced 404 Animation */}
        <div className="mb-8 relative">
          <div className={`text-8xl md:text-9xl font-bold text-gray-200 select-none transition-all duration-1000 ${mounted ? 'animate-pulse' : ''}`}>
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-24 h-24 md:w-32 md:h-32 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-xl transition-all duration-1000 ${mounted ? 'animate-bounce' : 'scale-0'}`}>
              <svg className="w-12 h-12 md:w-16 md:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`space-y-6 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
            Sayfa Bulunamadı
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 max-w-md mx-auto leading-relaxed">
            Aradığınız sayfa mevcut değil veya taşınmış olabilir.
          </p>

          {/* Search Form */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 max-w-md mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Haber Arayın
            </h2>
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Aranacak kelime..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link 
              to="/"
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Ana Sayfaya Dön
            </Link>
            
            <Link 
              to="/search"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-700 border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Haber Ara
            </Link>
          </div>

          {/* Quick Links */}
          <div className="pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">Popüler bağlantılar:</p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <Link to="/about" className="text-red-600 hover:text-red-700 hover:underline transition-colors">
                Hakkımızda
              </Link>
              <Link to="/contact" className="text-red-600 hover:text-red-700 hover:underline transition-colors">
                İletişim
              </Link>
              <Link to="/faq" className="text-red-600 hover:text-red-700 hover:underline transition-colors">
                SSS
              </Link>
            </div>
          </div>
        </div>

        {/* Background Decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className={`absolute -top-40 -right-40 w-80 h-80 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 transition-all duration-2000 ${mounted ? 'animate-blob' : 'scale-0'}`}></div>
          <div className={`absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 transition-all duration-2000 delay-1000 ${mounted ? 'animate-blob animation-delay-2000' : 'scale-0'}`}></div>
          <div className={`absolute top-40 left-40 w-80 h-80 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 transition-all duration-2000 delay-2000 ${mounted ? 'animate-blob animation-delay-4000' : 'scale-0'}`}></div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }      `}} />
    </div>
  )
}

export default NotFound
