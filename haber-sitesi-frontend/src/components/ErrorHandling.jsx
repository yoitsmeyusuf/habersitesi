// Enhanced Error Handling UX Components
// Comprehensive error handling with better user experience and recovery options

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../components/Toast'

/**
 * Network Error Handler with retry functionality
 */
export const NetworkErrorHandler = ({ error, onRetry, children }) => {
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const { showToast } = useToast()

  const handleRetry = async () => {
    setIsRetrying(true)
    setRetryCount(prev => prev + 1)
      try {
      await onRetry?.()
      showToast('Bağlantı yeniden kuruldu', 'success')
    } catch (error) {
      console.error('Retry failed:', error)
      showToast('Yeniden deneme başarısız', 'error')
    } finally {
      setIsRetrying(false)
    }
  }

  const getErrorMessage = () => {
    if (error?.message?.includes('NetworkError') || error?.message?.includes('fetch')) {
      return 'İnternet bağlantınızı kontrol edin ve yeniden deneyin'
    }
    if (error?.status === 404) {
      return 'Aradığınız sayfa bulunamadı'
    }
    if (error?.status === 500) {
      return 'Sunucu hatası oluştu, daha sonra tekrar deneyin'
    }
    if (error?.status === 403) {
      return 'Bu işlem için yetkiniz bulunmuyor'
    }
    return error?.message || 'Beklenmeyen bir hata oluştu'
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center animate-slide-up">
          {/* Error Icon */}
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          {/* Error Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Bir Sorun Oluştu
          </h1>

          {/* Error Message */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            {getErrorMessage()}
          </p>

          {/* Retry Count Display */}
          {retryCount > 0 && (
            <p className="text-sm text-gray-500 mb-4">
              Deneme sayısı: {retryCount}
            </p>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              disabled={isRetrying || retryCount >= 3}
              className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isRetrying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Yeniden deneniyor...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Yeniden Dene</span>
                </>
              )}
            </button>

            <button
              onClick={() => window.location.href = '/'}
              className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
            >
              Ana Sayfaya Dön
            </button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-gray-500 mt-6">
            Sorun devam ederse lütfen{' '}
            <a href="mailto:destek@habersitesi.com" className="text-red-600 hover:underline">
              destek@habersitesi.com
            </a>{' '}
            adresine yazın
          </p>
        </div>
      </div>
    )
  }

  return children
}

/**
 * Form Error Display Component
 */
export const FormErrorDisplay = ({ errors, field }) => {
  if (!errors || !errors[field]) return null

  return (
    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-slide-up">
      <div className="flex items-start space-x-2">
        <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h4 className="text-sm font-medium text-red-800">Hata</h4>
          <p className="text-sm text-red-600 mt-1">{errors[field]}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Validation Error Summary Component
 */
export const ValidationErrorSummary = ({ errors, onClose }) => {
  if (!errors || Object.keys(errors).length === 0) return null

  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-slide-up">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Formu göndermeden önce aşağıdaki hataları düzeltin:
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {Object.entries(errors).map(([field, message]) => (
                <li key={field} className="text-sm text-red-600">
                  <strong>{field}:</strong> {message}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-red-500 hover:text-red-700 transition-colors"
            aria-label="Hata mesajını kapat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * 404 Error Page Component
 */
export const NotFoundError = () => {
  const [searchTerm, setSearchTerm] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center animate-slide-up">
        {/* 404 Illustration */}
        <div className="w-32 h-32 mx-auto mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-100 to-red-200 rounded-full"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-bold text-red-600">404</span>
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Sayfa Bulunamadı
        </h1>

        {/* Error Description */}
        <p className="text-gray-600 mb-8 leading-relaxed">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir. 
          Aşağıdaki seçenekleri deneyebilirsiniz:
        </p>

        {/* Quick Actions */}
        <div className="space-y-4 mb-8">
          <button
            onClick={() => window.location.href = '/'}
            className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 font-semibold flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Ana Sayfaya Dön</span>
          </button>

          <button
            onClick={() => window.history.back()}
            className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Geri Dön</span>
          </button>
        </div>

        {/* Search Form */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Aradığınızı bulamadınız mı?
          </h3>
          <form onSubmit={handleSearch} className="flex space-x-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Arama yapın..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors duration-200 font-medium"
            >
              Ara
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

/**
 * Generic Error Boundary Component
 */
export const EnhancedErrorBoundary = ({ children, fallback, context = 'Bu bölüm' }) => {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState(null)
  const { showToast } = useToast()

  useEffect(() => {
    const handleError = (event) => {
      setHasError(true)
      setError(event.error)
      showToast(`${context} yüklenirken hata oluştu`, 'error')
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [context, showToast])

  const resetError = () => {
    setHasError(false)
    setError(null)
  }

  if (hasError) {
    if (fallback) {
      return fallback(error, resetError)
    }

    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center">
        <svg className="w-12 h-12 text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          {context} Yüklenemedi
        </h3>
        <p className="text-red-600 mb-4">
          Beklenmeyen bir hata oluştu
        </p>
        <button
          onClick={resetError}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium"
        >
          Yeniden Dene
        </button>
      </div>
    )
  }

  return children
}

/**
 * Connection Status Indicator
 */
export const ConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const { showToast } = useToast()

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      showToast('İnternet bağlantısı yeniden kuruldu', 'success')
    }

    const handleOffline = () => {
      setIsOnline(false)
      showToast('İnternet bağlantısı kesildi', 'error')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [showToast])

  if (!isOnline) {
    return (
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg animate-slide-up">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
          </svg>
          <span className="text-sm font-medium">Çevrimdışı</span>
        </div>
      </div>
    )
  }
  return null
}

/**
 * Not Found Page Component
 */
export const NotFoundPage = ({ 
  title = "Sayfa Bulunamadı",
  message = "Aradığınız sayfa mevcut değil veya kaldırılmış olabilir.",
  showHomeButton = true,
  homeButtonText = "Ana Sayfaya Dön"
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center animate-slide-up">
        {/* 404 Icon */}
        <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl font-bold text-yellow-600">404</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {title}
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-8 leading-relaxed">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          {showHomeButton && (
            <Link
              to="/"
              className="block w-full bg-gradient-to-r from-primary-500 to-accent-500 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              {homeButtonText}
            </Link>
          )}
          
          <button
            onClick={() => window.history.back()}
            className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
          >
            Geri Dön
          </button>
        </div>
      </div>
    </div>
  )
}

export default {
  NetworkErrorHandler,
  FormErrorDisplay,
  ValidationErrorSummary,
  NotFoundError,
  EnhancedErrorBoundary,
  ConnectionStatus,
  NotFoundPage
}
