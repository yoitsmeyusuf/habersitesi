/**
 * Production-safe logging utility
 * Automatically disables logs in production environment
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.NODE_ENV === 'development'
const isProduction = import.meta.env.NODE_ENV === 'production'

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },
  
  error: (...args) => {
    if (isDevelopment) {
      console.error(...args)
    } else {
      // Production'da sadece kritik hataları logla
      console.error('[ERROR]', new Date().toISOString())
    }
  },
  
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },

  // Production'da bile kritik hataları logla (ama hassas veri olmadan)
  critical: (message, context = '') => {
    const safeMessage = typeof message === 'string' ? message : 'Critical error occurred'
    if (isProduction) {
      // Production'da external logging service'e gönder
      console.error(`[CRITICAL] ${safeMessage}`, context ? `Context: ${context}` : '')
      // TODO: External monitoring service integration (Sentry, LogRocket, etc.)
    } else {
      console.error(`[CRITICAL] ${safeMessage}`, context ? `Context: ${context}` : '')
    }
  },

  // Performance monitoring
  performance: (label, duration) => {
    if (isDevelopment) {
      console.log(`[PERF] ${label}: ${duration}ms`)
    }
  },

  // Analytics events
  analytics: (event, data) => {
    if (isDevelopment) {
      console.log(`[ANALYTICS] ${event}:`, data)
    }
    // Production'da analytics service'e gönder
    if (isProduction && window.gtag) {
      window.gtag('event', event, data)
    }
  }
}

// Debug modunda ek bilgiler
export const debugLog = (...args) => {
  if (isDevelopment) {
    console.log('[DEBUG]', ...args)
  }
}

export default logger
