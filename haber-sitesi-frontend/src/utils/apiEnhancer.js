// Enhanced API service wrapper with UX improvements
import { setGlobalLoading } from './Loading'
import logger from './logger'

// Toast notification state - will be set by components
let toastFunction = null

export const setToastFunction = (toastFn) => {
  toastFunction = toastFn
}

const showToast = (message, type = 'info') => {
  if (toastFunction) {
    toastFunction(message, type)
  }
}

// Enhanced API wrapper with UX feedback
export const createEnhancedApiWrapper = (originalApi) => {
  const enhancedApi = { ...originalApi }
  
  // List of methods that should show loading state
  const loadingMethods = [
    'login', 'register', 'addNews', 'updateNews', 'deleteNews',
    'uploadImage', 'uploadProfilePicture', 'updateProfile',
    'addComment', 'deleteComment', 'subscribeNewsletter'
  ]
  
  // List of methods that should show success messages
  const successMethods = {
    login: 'Giriş başarılı!',
    register: 'Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...',
    addNews: 'Haber başarıyla eklendi!',
    updateNews: 'Haber başarıyla güncellendi!',
    deleteNews: 'Haber başarıyla silindi!',
    addComment: 'Yorumunuz başarıyla eklendi!',
    deleteComment: 'Yorum başarıyla silindi!',
    subscribeNewsletter: 'Bülten aboneliğiniz başarıyla tamamlandı!',
    uploadImage: 'Resim başarıyla yüklendi!',
    uploadProfilePicture: 'Profil resmi başarıyla güncellendi!',
    updateProfile: 'Profil bilgileriniz başarıyla güncellendi!'
  }
  
  // Enhanced error messages
  const errorMessages = {
    login: 'Giriş yapılırken bir hata oluştu. Lütfen bilgilerinizi kontrol edin.',
    register: 'Kayıt olurken bir hata oluştu. Lütfen bilgilerinizi kontrol edin.',
    addNews: 'Haber eklenirken bir hata oluştu.',
    updateNews: 'Haber güncellenirken bir hata oluştu.',
    deleteNews: 'Haber silinirken bir hata oluştu.',
    addComment: 'Yorum eklenirken bir hata oluştu.',
    deleteComment: 'Yorum silinirken bir hata oluştu.',
    subscribeNewsletter: 'Bülten aboneliğinde bir hata oluştu.',
    uploadImage: 'Resim yüklenirken bir hata oluştu.',
    uploadProfilePicture: 'Profil resmi güncellenirken bir hata oluştu.',
    updateProfile: 'Profil güncellenirken bir hata oluştu.'
  }
  
  // Wrap methods with enhanced UX
  Object.keys(originalApi).forEach(methodName => {
    if (typeof originalApi[methodName] === 'function') {
      const originalMethod = originalApi[methodName]
      
      enhancedApi[methodName] = async function(...args) {
        const showLoading = loadingMethods.includes(methodName)
        const successMessage = successMethods[methodName]
        const errorMessage = errorMessages[methodName]
        
        try {
          // Show loading state
          if (showLoading) {
            setGlobalLoading(true)
          }
          
          // Call original method
          const result = await originalMethod.apply(this, args)
          
          // Handle success
          if (result && result.success !== false) {
            if (successMessage) {
              showToast(successMessage, 'success')
            }
          } else if (result && result.success === false) {
            // Handle API errors
            const message = result.message || errorMessage || 'Bir hata oluştu'
            showToast(message, 'error')
          }
          
          return result
        } catch (error) {
          // Handle network/unexpected errors
          logger.error(`Error in ${methodName}:`, error)
          const message = error.message || errorMessage || 'Beklenmeyen bir hata oluştu'
          showToast(message, 'error')
          
          // Return error result in expected format
          return { success: false, message: message }
        } finally {
          // Hide loading state
          if (showLoading) {
            setGlobalLoading(false)
          }
        }
      }
    }
  })
  
  return enhancedApi
}

// Network status monitoring
export class NetworkMonitor {
  constructor() {
    this.isOnline = navigator.onLine
    this.listeners = []
    
    window.addEventListener('online', () => {
      this.isOnline = true
      showToast('İnternet bağlantısı geri geldi', 'success')
      this.notifyListeners(true)
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
      showToast('İnternet bağlantısı kesildi', 'warning')
      this.notifyListeners(false)
    })
  }
  
  onStatusChange(callback) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }
  
  notifyListeners(status) {
    this.listeners.forEach(callback => callback(status))
  }
}

// Create singleton instance
export const networkMonitor = new NetworkMonitor()

// Retry mechanism for failed requests
export class RetryHandler {
  static async withRetry(fn, maxRetries = 3, delay = 1000) {
    let lastError
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        
        if (i === maxRetries) {
          throw error
        }
        
        // Show retry message
        if (i > 0) {
          showToast(`Yeniden deneniyor... (${i + 1}/${maxRetries + 1})`, 'info')
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
      }
    }
    
    throw lastError
  }
}

// Form validation helpers with UX feedback
export const validateWithFeedback = {
  required: (value, fieldName) => {
    if (!value || value.toString().trim() === '') {
      showToast(`${fieldName} alanı zorunludur`, 'error')
      return false
    }
    return true
  },
  
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      showToast('Geçerli bir e-posta adresi girin', 'error')
      return false
    }
    return true
  },
  
  password: (password) => {
    if (password.length < 8) {
      showToast('Şifre en az 8 karakter olmalıdır', 'error')
      return false
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      showToast('Şifre büyük harf, küçük harf ve rakam içermelidir', 'error')
      return false
    }
    return true
  },
  
  username: (username) => {
    if (username.length < 3 || username.length > 30) {
      showToast('Kullanıcı adı 3-30 karakter arasında olmalıdır', 'error')
      return false
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      showToast('Kullanıcı adı sadece harf, rakam, _ ve - içerebilir', 'error')
      return false
    }
    return true
  },
  
  fileSize: (file, maxSizeMB = 5) => {
    const maxSize = maxSizeMB * 1024 * 1024
    if (file.size > maxSize) {
      showToast(`Dosya boyutu ${maxSizeMB}MB'dan küçük olmalıdır`, 'error')
      return false
    }
    return true
  },
  
  fileType: (file, allowedTypes = ['image/jpeg', 'image/png', 'image/webp']) => {
    if (!allowedTypes.includes(file.type)) {
      showToast('Desteklenmeyen dosya türü', 'error')
      return false
    }
    return true
  }
}

// Optimistic UI updates
export class OptimisticUpdates {
  static async withOptimisticUpdate(
    optimisticUpdate,
    actualUpdate,
    rollbackUpdate
  ) {
    // Apply optimistic update immediately
    optimisticUpdate()
    
    try {
      // Perform actual update
      const result = await actualUpdate()
      
      if (result && result.success === false) {
        // Rollback on API error
        rollbackUpdate()
        return result
      }
      
      return result
    } catch (error) {
      // Rollback on network error
      rollbackUpdate()
      throw error
    }
  }
}

// Performance monitoring
export class PerformanceMonitor {
  static measureApiCall(methodName, fn) {
    return async function(...args) {
      const startTime = performance.now()
      
      try {
        const result = await fn.apply(this, args)
        const duration = performance.now() - startTime
        
        // Log slow API calls
        if (duration > 2000) {
          logger.warn(`Slow API call detected: ${methodName} took ${duration.toFixed(2)}ms`)
        }
        
        return result
      } catch (error) {
        const duration = performance.now() - startTime
        logger.error(`API call failed: ${methodName} took ${duration.toFixed(2)}ms`, error)
        throw error
      }
    }
  }
}

// Cache management for better UX
export class CacheManager {
  constructor() {
    this.cache = new Map()
    this.expiryTimes = new Map()
  }
  
  set(key, value, ttlSeconds = 300) {
    this.cache.set(key, value)
    this.expiryTimes.set(key, Date.now() + ttlSeconds * 1000)
  }
  
  get(key) {
    const expiryTime = this.expiryTimes.get(key)
    if (expiryTime && Date.now() > expiryTime) {
      this.delete(key)
      return null
    }
    return this.cache.get(key)
  }
  
  delete(key) {
    this.cache.delete(key)
    this.expiryTimes.delete(key)
  }
  
  clear() {
    this.cache.clear()
    this.expiryTimes.clear()
  }
}

// Create singleton cache instance
export const apiCache = new CacheManager()

export default {
  createEnhancedApiWrapper,
  setToastFunction,
  NetworkMonitor,
  networkMonitor,
  RetryHandler,
  validateWithFeedback,
  OptimisticUpdates,
  PerformanceMonitor,
  CacheManager,
  apiCache
}
