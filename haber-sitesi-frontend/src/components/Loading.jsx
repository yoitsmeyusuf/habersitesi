// Loading components for better UX feedback
import { useState, useEffect } from 'react'

// Global loading state
let globalLoadingState = false
let loadingListeners = []

export const setGlobalLoading = (loading) => {
  globalLoadingState = loading
  loadingListeners.forEach(listener => listener(loading))
}

export const useGlobalLoading = () => {
  const [loading, setLoading] = useState(globalLoadingState)
  
  useEffect(() => {
    const listener = (newLoading) => setLoading(newLoading)
    loadingListeners.push(listener)
    return () => {
      loadingListeners = loadingListeners.filter(l => l !== listener)
    }
  }, [])
  
  return loading
}

// Enhanced spinner with better animation
export const Spinner = ({ size = 'md', color = 'red', label = 'Yükleniyor...' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }
  
  const colorClasses = {
    red: 'text-red-600',
    blue: 'text-blue-600',
    gray: 'text-gray-600',
    white: 'text-white'
  }

  return (
    <div className="flex items-center justify-center" role="status" aria-label={label}>
      <svg 
        className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  )
}

// Loading overlay for full-screen loading states
export const LoadingOverlay = ({ message = 'Yükleniyor...', transparent = false }) => {
  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        transparent ? 'bg-white/70' : 'bg-white/90'
      } backdrop-blur-sm`}
      role="dialog"
      aria-modal="true"
      aria-label="Yükleme ekranı"
    >
      <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-lg shadow-xl border">
        <Spinner size="lg" />
        <p className="text-gray-700 font-medium text-center">{message}</p>
      </div>
    </div>
  )
}

// Global loading overlay that shows when global loading is active
export const GlobalLoadingOverlay = () => {
  const isLoading = useGlobalLoading()
  
  if (!isLoading) return null
  
  return <LoadingOverlay />
}

// Loading skeleton for content placeholders
export const LoadingSkeleton = ({ 
  lines = 3, 
  className = '', 
  showAvatar = false,
  showTitle = true 
}) => {
  return (
    <div className={`animate-pulse ${className}`} role="status" aria-label="İçerik yükleniyor">
      <div className="flex items-start space-x-4">
        {showAvatar && (
          <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0" />
        )}
        <div className="flex-1 space-y-3">
          {showTitle && (
            <div className="h-4 bg-gray-300 rounded w-3/4" />
          )}
          {Array.from({ length: lines }).map((_, i) => (
            <div 
              key={i}
              className={`h-3 bg-gray-300 rounded ${
                i === lines - 1 ? 'w-1/2' : 'w-full'
              }`} 
            />
          ))}
        </div>
      </div>
      <span className="sr-only">İçerik yükleniyor, lütfen bekleyin...</span>
    </div>
  )
}

// News card loading skeleton
export const NewsCardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse" role="status" aria-label="Haber kartı yükleniyor">
      <div className="w-full h-48 bg-gray-300" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-300 rounded w-3/4" />
        <div className="space-y-2">
          <div className="h-3 bg-gray-300 rounded" />
          <div className="h-3 bg-gray-300 rounded w-5/6" />
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gray-300 rounded-full" />
          <div className="h-3 bg-gray-300 rounded w-24" />
        </div>
      </div>
      <span className="sr-only">Haber kartı yükleniyor, lütfen bekleyin...</span>
    </div>
  )
}

// Button loading state
export const LoadingButton = ({ 
  loading, 
  children, 
  disabled, 
  className = '',
  loadingText = 'Yükleniyor...',
  ...props 
}) => {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`relative ${className} ${loading ? 'cursor-not-allowed' : ''}`}
      aria-disabled={disabled || loading}
      aria-busy={loading}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size="sm" color="white" />
        </div>
      )}
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {loading ? loadingText : children}
      </span>
    </button>
  )
}

// Progress bar component
export const ProgressBar = ({ 
  progress, 
  className = '', 
  showPercentage = true,
  label = 'İlerleme'
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress))
  
  return (
    <div className={`w-full ${className}`} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={clampedProgress} aria-label={label}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {showPercentage && (
          <span className="text-sm font-medium text-gray-700">{Math.round(clampedProgress)}%</span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-red-600 h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}

// Lazy loading wrapper with intersection observer
export const LazyLoader = ({ 
  children, 
  placeholder = <LoadingSkeleton />, 
  rootMargin = '50px',
  threshold = 0.1 
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true)
          setHasLoaded(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold }
    )
    
    const element = document.getElementById(`lazy-${Math.random()}`)
    if (element) observer.observe(element)
    
    return () => observer.disconnect()
  }, [rootMargin, threshold, hasLoaded])
  
  return (
    <div id={`lazy-${Math.random()}`}>
      {isVisible ? children : placeholder}
    </div>
  )
}

export default {
  Spinner,
  LoadingOverlay,
  GlobalLoadingOverlay,
  LoadingSkeleton,
  NewsCardSkeleton,
  LoadingButton,
  ProgressBar,
  LazyLoader,
  setGlobalLoading,
  useGlobalLoading
}
