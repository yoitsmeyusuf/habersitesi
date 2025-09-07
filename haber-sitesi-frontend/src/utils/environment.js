/**
 * Environment Configuration Utility
 * Centralized management of environment variables and API endpoints
 */

import logger from './logger'

// Base configuration
export const ENV = {
  // API endpoints
  API_URL: import.meta.env.VITE_API_URL || "http://localhost:5255/api",
  BASE_URL: import.meta.env.VITE_BASE_URL || "http://localhost:5255",
  
  // Environment
  NODE_ENV: import.meta.env.NODE_ENV || "development",
  IS_DEVELOPMENT: import.meta.env.NODE_ENV === "development",
  IS_PRODUCTION: import.meta.env.NODE_ENV === "production",
  
  // API timeouts
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
}

// API helper functions
export const getApiUrl = (endpoint = '') => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  return `${ENV.API_URL}/${cleanEndpoint}`.replace(/\/+/g, '/').replace(':/', '://')
}

export const getImageUrl = (imagePath) => {
  if (!imagePath) return null
  
  // If already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  
  // If starts with /, prepend base URL
  if (imagePath.startsWith('/')) {
    return `${ENV.BASE_URL}${imagePath}`
  }
  
  // Otherwise, assume it's a relative path
  return `${ENV.BASE_URL}/${imagePath}`
}

export const getFullUrl = (path) => {
  if (!path) return ENV.BASE_URL
  
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${ENV.BASE_URL}/${cleanPath}`.replace(/\/+/g, '/').replace(':/', '://')
}

// Debug helper
export const logEnvironment = () => {
  if (ENV.IS_DEVELOPMENT) {
    logger.log('🔧 Environment Configuration:', {
      API_URL: ENV.API_URL,
      BASE_URL: ENV.BASE_URL,
      NODE_ENV: ENV.NODE_ENV,
      IS_DEVELOPMENT: ENV.IS_DEVELOPMENT,
      IS_PRODUCTION: ENV.IS_PRODUCTION,
    })
  }
}

export default ENV
