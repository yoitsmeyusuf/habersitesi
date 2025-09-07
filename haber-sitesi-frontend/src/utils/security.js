// Input validation and sanitization utilities
import logger from './logger'

export const validateInput = {
  // Email validation
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254
  },

  // Username validation - alphanumeric, underscore, hyphen only
  username: (username) => {
    const usernameRegex = /^[a-zA-Z0-9_-]+$/
    return usernameRegex.test(username) && username.length >= 3 && username.length <= 30
  },

  // Password strength validation
  password: (password) => {
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /[0-9]/.test(password)
  },

  // Basic HTML content sanitization (remove script tags)
  htmlContent: (content) => {
    if (!content) return ''
    // Remove script tags and dangerous attributes
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '')
  },
  // File validation
  imageFile: (file) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const maxSize = 5 * 1024 * 1024 // 5MB
    return allowedTypes.includes(file.type) && file.size <= maxSize
  },

  // URL validation
  url: (url) => {
    try {
      const parsedUrl = new URL(url)
      return ['http:', 'https:'].includes(parsedUrl.protocol)
    } catch {
      return false
    }
  },
  // Relative URL validation (for internal links)
  relativeUrl: (url) => {
    // Allow relative URLs starting with / or relative paths
    const relativeRegex = /^(\/[^/\s][^\s]*|[^/\s][^\s]*)$/
    return relativeRegex.test(url) && !url.includes('..') && !url.startsWith('javascript:')
  },

  // Icon URL validation (for notification icons)
  iconUrl: (url) => {
    if (!url) return true // Optional field
    
    // Check if it's a valid URL
    if (validateInput.url(url)) {
      // Must be image file
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
      return imageExtensions.some(ext => url.toLowerCase().includes(ext))
    }
    
    // Or check if it's a relative path to image
    if (validateInput.relativeUrl(url)) {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
      return imageExtensions.some(ext => url.toLowerCase().endsWith(ext))
    }
    
    return false
  },

  // Numeric validation
  numeric: (value) => {
    return !isNaN(value) && !isNaN(parseFloat(value)) && isFinite(value)
  },

  // Text length validation
  textLength: (text, min = 0, max = 1000) => {
    if (!text) return min === 0
    return text.length >= min && text.length <= max
  },
  // Comment validation with spam detection
  comment: (text) => {
    if (!text || text.trim().length < 5) return false
    if (text.length > 1000) return false
    
    // Basic spam detection patterns
    const spamPatterns = [
      /https?:\/\//gi, // URLs
      /casino|poker|viagra|cialis/gi, // Common spam words
      /(.)\1{4,}/g, // Repeated characters (5 or more)
      /[A-Z]{5,}/g, // All caps words (5+ chars)
    ]
    
    const spamMatches = spamPatterns.reduce((count, pattern) => {
      const matches = text.match(pattern)
      return count + (matches ? matches.length : 0)
    }, 0)
    
    return spamMatches < 3 // Allow some flexibility
  }
}

// XSS protection for text content
export const sanitizeText = (text) => {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Advanced XSS protection for HTML content
export const sanitizeHtml = (html) => {
  if (!html) return ''
  
  // Create temporary div to safely parse HTML
  const temp = document.createElement('div')
  temp.innerHTML = html
  
  // Remove dangerous elements
  const dangerousElements = temp.querySelectorAll('script, object, embed, link, meta, iframe')
  dangerousElements.forEach(el => el.remove())
  
  // Remove dangerous attributes
  const allElements = temp.querySelectorAll('*')
  allElements.forEach(el => {
    const attributes = [...el.attributes]
    attributes.forEach(attr => {
      if (attr.name.startsWith('on') || attr.value.includes('javascript:')) {
        el.removeAttribute(attr.name)
      }
    })
  })
  
  return temp.innerHTML
}

// CSRF Token Management
export const csrfToken = {
  get() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || 
           sessionStorage.getItem('csrf-token') ||
           localStorage.getItem('csrf-token')
  },
  
  set(token) {
    sessionStorage.setItem('csrf-token', token)
    // Also set in meta tag if it exists
    const metaTag = document.querySelector('meta[name="csrf-token"]')
    if (metaTag) {
      metaTag.setAttribute('content', token)
    }
  },
  
  clear() {
    sessionStorage.removeItem('csrf-token')
    localStorage.removeItem('csrf-token')
    const metaTag = document.querySelector('meta[name="csrf-token"]')
    if (metaTag) {
      metaTag.removeAttribute('content')
    }
  }
}

// Input encoding utilities
export const encodeUtils = {
  htmlEntities: (text) => {
    if (!text) return ''
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
  },
  
  urlEncode: (text) => {
    if (!text) return ''
    return encodeURIComponent(text)
  },
  
  base64Encode: (text) => {
    if (!text) return ''
    return btoa(unescape(encodeURIComponent(text)))
  }
}

// Rate limiting helper
export class RateLimiter {
  constructor(maxRequests = 10, timeWindow = 60000) {
    this.requests = new Map()
    this.maxRequests = maxRequests
    this.timeWindow = timeWindow
  }

  canMakeRequest(identifier = 'default') {
    const now = Date.now()
    const userRequests = this.requests.get(identifier) || []
    
    // Remove old requests outside time window
    const validRequests = userRequests.filter(time => now - time < this.timeWindow)
    
    return validRequests.length < this.maxRequests
  }

  recordRequest(identifier = 'default') {
    const now = Date.now()
    const userRequests = this.requests.get(identifier) || []
    
    // Remove old requests outside time window
    const validRequests = userRequests.filter(time => now - time < this.timeWindow)
    
    // Add current request
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    
    return validRequests.length
  }
}

// Token Management Functions
export const getToken = () => {
  try {
    return localStorage.getItem('token')
  } catch (error) {
    logger.error('Error getting token:', error)
    return null
  }
}

export const setToken = (token) => {
  try {
    localStorage.setItem('token', token)
    return true
  } catch (error) {
    logger.error('Error setting token:', error)
    return false
  }
}

export const removeToken = () => {
  try {
    localStorage.removeItem('token')
    return true
  } catch (error) {
    logger.error('Error removing token:', error)
    return false
  }
}

// Session Management
export const initializeSessionManagement = () => {
  // Check token validity
  const token = getToken()
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const isExpired = payload.exp * 1000 < Date.now()
      
      if (isExpired) {
        removeToken()
        logError('Token expired, removed from storage')
        return false
      }
      
      // Set up token refresh timer
      const refreshTime = (payload.exp * 1000) - Date.now() - 60000 // 1 minute before expiry
      if (refreshTime > 0) {
        setTimeout(() => {
          // Token refresh logic can be added here
          logger.log('Token refresh needed')
        }, refreshTime)
      }
      
      return true
    } catch (error) {
      logError('Invalid token format:', error)
      removeToken()
      return false
    }
  }
  
  return false
}

// Logging Function
export const logError = (message, error = null) => {
  const timestamp = new Date().toISOString()
  const errorData = {
    timestamp,
    message,
    error: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : null,
    userAgent: navigator.userAgent,
    url: window.location.href
  }
  
  logger.error('[Security Error]', errorData)
  
  // You can add additional logging here like sending to a logging service
  // Example: sendToLoggingService(errorData)
}
