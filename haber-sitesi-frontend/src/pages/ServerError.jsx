import React, { useEffect, useState } from 'react'
import logger from '../utils/logger'
import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'
import { ConnectionStatus } from '../components/ErrorHandling'

const ServerError = ({ error, resetError }) => {
  const [mounted, setMounted] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  useEffect(() => {
    setMounted(true)
    // Log error for analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'server_error', {
        error_message: error?.message || 'Unknown server error',
        page_location: window.location.href
      })
    }
  }, [error])

  const handleReportError = async () => {
    try {
      // Send error report to your backend
      const errorReport = {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }

      // Replace with your actual error reporting endpoint
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorReport)
      })

      setReportSent(true)
    } catch (err) {
      logger.error('Failed to report error:', err)
    }
  }

  const handleRefresh = () => {
    if (resetError) {
      resetError()
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center px-4">
      <ConnectionStatus />
      
      <SEOHead
        title="Sunucu Hatası - 500"
        description="Bir sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin."
        noindex={true}
      />

      <div className="max-w-2xl mx-auto text-center">
        {/* Error Animation */}
        <div className="mb-8 relative">
          <div className={`text-8xl md:text-9xl font-bold text-red-200 select-none transition-all duration-1000 ${mounted ? 'animate-pulse' : ''}`}>
            500
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-24 h-24 md:w-32 md:h-32 bg-gradient-to-r from-red-600 to-red-700 rounded-full flex items-center justify-center shadow-xl transition-all duration-1000 ${mounted ? 'animate-bounce' : 'scale-0'}`}>
              <svg className="w-12 h-12 md:w-16 md:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`space-y-6 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
            Sunucu Hatası
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 max-w-md mx-auto leading-relaxed">
            Beklenmeyen bir hata oluştu. Teknik ekibimiz sorunu çözmek için çalışıyor.
          </p>          {/* Error Details (Development only) */}
          {import.meta.env.DEV && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left max-w-lg mx-auto">
              <h3 className="font-semibold text-red-800 mb-2">Hata Detayları (Geliştirme):</h3>
              <p className="text-sm text-red-700 font-mono break-all">
                {error.message}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <button 
              onClick={handleRefresh}
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sayfayı Yenile
            </button>
            
            <Link 
              to="/"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-700 border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Ana Sayfaya Dön
            </Link>
          </div>

          {/* Error Reporting */}
          <div className="pt-6">
            {!reportSent ? (
              <button 
                onClick={handleReportError}
                className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
              >
                Bu hatayı bildir
              </button>
            ) : (
              <p className="text-sm text-green-600 flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Hata raporu gönderildi. Teşekkürler!
              </p>
            )}
          </div>

          {/* Help Links */}
          <div className="pt-8 border-t border-red-200">
            <p className="text-sm text-gray-500 mb-4">Yardıma mı ihtiyacınız var?</p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <Link to="/contact" className="text-red-600 hover:text-red-700 hover:underline transition-colors">
                İletişim
              </Link>
              <Link to="/faq" className="text-red-600 hover:text-red-700 hover:underline transition-colors">
                Sıkça Sorulan Sorular
              </Link>
              <a href="mailto:destek@habersitesi.com" className="text-red-600 hover:text-red-700 hover:underline transition-colors">
                Destek
              </a>
            </div>
          </div>
        </div>

        {/* Background Decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className={`absolute -top-40 -right-40 w-80 h-80 bg-red-300 rounded-full mix-blend-multiply filter blur-xl opacity-50 transition-all duration-2000 ${mounted ? 'animate-blob' : 'scale-0'}`}></div>
          <div className={`absolute -bottom-40 -left-40 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-50 transition-all duration-2000 delay-1000 ${mounted ? 'animate-blob animation-delay-2000' : 'scale-0'}`}></div>
          <div className={`absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-50 transition-all duration-2000 delay-2000 ${mounted ? 'animate-blob animation-delay-4000' : 'scale-0'}`}></div>
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
        }
      `}} />
    </div>
  )
}

export default ServerError
