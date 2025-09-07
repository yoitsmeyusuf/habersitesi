import React, { useState, useEffect, createContext, useContext } from 'react'

// Toast Context
const ToastContext = createContext()

// Toast Provider Component
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const addToast = (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random()
    const toast = {
      id,
      message,
      type, // 'success', 'error', 'warning', 'info'
      duration,
      timestamp: Date.now()
    }

    setToasts(prev => [...prev, toast])

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const clearAllToasts = () => {
    setToasts([])
  }

  return (
    <ToastContext.Provider value={{ 
      toasts, 
      addToast, 
      removeToast, 
      clearAllToasts,
      showToast: addToast, // Generic showToast function
      showSuccess: (message, duration) => addToast(message, 'success', duration),
      showError: (message, duration) => addToast(message, 'error', duration),
      showWarning: (message, duration) => addToast(message, 'warning', duration),
      showInfo: (message, duration) => addToast(message, 'info', duration)
    }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

// Toast Container Component
const ToastContainer = () => {
  const { toasts, removeToast } = useContext(ToastContext)

  return (
    <div 
      className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none"
      role="alert"
      aria-live="polite"
      aria-label="Bildirimler"
    >
      {toasts.map(toast => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onRemove={removeToast} 
        />
      ))}
    </div>
  )
}

// Individual Toast Item Component
const ToastItem = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleRemove = () => {
    setIsLeaving(true)
    setTimeout(() => onRemove(toast.id), 300)
  }

  const getToastStyles = () => {
    const baseStyles = "pointer-events-auto relative overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-300 transform"
    
    const typeStyles = {
      success: "bg-green-50 text-green-800 ring-green-200",
      error: "bg-red-50 text-red-800 ring-red-200", 
      warning: "bg-yellow-50 text-yellow-800 ring-yellow-200",
      info: "bg-blue-50 text-blue-800 ring-blue-200"
    }

    const animationStyles = isLeaving 
      ? "translate-x-full opacity-0 scale-95"
      : isVisible 
        ? "translate-x-0 opacity-100 scale-100" 
        : "translate-x-full opacity-0 scale-95"

    return `${baseStyles} ${typeStyles[toast.type]} ${animationStyles}`
  }

  const getIconForType = () => {
    const iconStyles = "w-5 h-5 flex-shrink-0"
    
    switch (toast.type) {
      case 'success':
        return (
          <svg className={`${iconStyles} text-green-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className={`${iconStyles} text-red-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'warning':
        return (
          <svg className={`${iconStyles} text-yellow-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'info':
      default:
        return (
          <svg className={`${iconStyles} text-blue-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    <div className={getToastStyles()}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIconForType()}
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium">
              {toast.message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              type="button"
              className="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
              onClick={handleRemove}
              aria-label="Bildirimi kapat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Progress bar for auto-dismiss */}
      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-black bg-opacity-10">
          <div 
            className="h-full bg-current opacity-50 animate-toast-progress"
            style={{ 
              animationDuration: `${toast.duration}ms`,
              animationTimingFunction: 'linear'
            }}
          />
        </div>
      )}
    </div>
  )
}

// Hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export default ToastProvider
