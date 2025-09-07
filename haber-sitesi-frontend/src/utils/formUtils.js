/**
 * Form Utilities for Enhanced UX
 * Provides common form validation, error handling, and UX enhancements
 */

import { validateInput } from './security'
import logger from './logger'

/**
 * Validates login form data
 * @param {Object} data - Form data {username, password}
 * @returns {Object} - {isValid, errors}
 */
export const validateLoginForm = (data) => {
  const errors = {}
  
  if (!data.username || !data.password) {
    errors.general = 'Kullanıcı adı ve şifre gereklidir'
    return { isValid: false, errors }
  }
  
  if (!validateInput.username(data.username)) {
    errors.username = 'Geçersiz kullanıcı adı formatı'
  }
  
  if (data.password.length < 3) {
    errors.password = 'Şifre en az 3 karakter olmalıdır'
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Validates registration form data
 * @param {Object} data - Form data {username, email, password}
 * @returns {Object} - {isValid, errors}
 */
export const validateRegisterForm = (data) => {
  const errors = {}
  
  if (!data.username || !data.email || !data.password) {
    errors.general = 'Tüm alanları doldurun'
    return { isValid: false, errors }
  }
  
  if (!validateInput.username(data.username)) {
    errors.username = 'Kullanıcı adı sadece harf, rakam, _ ve - içerebilir (3-30 karakter)'
  }
  
  if (!validateInput.email(data.email)) {
    errors.email = 'Geçerli bir e-posta adresi girin'
  }
  
  if (!validateInput.password(data.password)) {
    errors.password = 'Şifre en az 6 karakter olmalı ve en az bir harf, bir rakam içermeli'
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Validates comment form data
 * @param {Object} data - Form data {comment, user, emailVerified}
 * @returns {Object} - {isValid, errors}
 */
export const validateCommentForm = (data) => {
  const errors = {}
  
  if (!data.user) {
    errors.auth = 'Yorum yapabilmek için giriş yapmalısınız.'
    return { isValid: false, errors }
  }
  
  if (!data.comment || !data.comment.trim()) {
    errors.comment = 'Yorum boş olamaz.'
  } else if (data.comment.length < 5) {
    errors.comment = 'Yorum en az 5 karakter olmalıdır.'
  } else if (data.comment.length > 1000) {
    errors.comment = 'Yorum 1000 karakterden uzun olamaz.'
  }
  
  if (!data.emailVerified) {
    errors.email = 'Yorum yapabilmek için e-posta adresinizi doğrulamalısınız.'
  }
  
  // Check for spam patterns
  const spamPatterns = [
    /https?:\/\//gi, // URLs
    /\b(viagra|casino|porn|xxx)\b/gi, // Common spam words
    /(.)\1{5,}/g // Repeated characters
  ]
  
  for (const pattern of spamPatterns) {
    if (pattern.test(data.comment)) {
      errors.comment = 'Yorumunuz spam olarak algılandı. Lütfen geçerli bir yorum yazın.'
      break
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Enhanced form submission handler with loading states and error handling
 * @param {Function} submitFunction - The actual submit function
 * @param {Function} setLoading - Loading state setter
 * @param {Function} setErrors - Error state setter
 * @param {Object} options - Additional options {successMessage, errorMessage, onSuccess, onError}
 */
export const handleFormSubmission = async (submitFunction, setLoading, setErrors, options = {}) => {
  logger.log('handleFormSubmission called with options:', options)
  setLoading(true)
  setErrors({})
  
  try {
    const result = await submitFunction()
    
    if (result && result.success !== false) {
      if (options.onSuccess) {
        options.onSuccess(result)
      }
      return result
    } else {
      const errorMsg = result?.message || options.errorMessage || 'İşlem başarısız'
      setErrors({ submit: errorMsg })
      if (options.onError) {
        options.onError(result)
      }
    }
  } catch (error) {
    logger.error('Form submission error:', error)
    const errorMsg = error.message || options.errorMessage || 'Bir hata oluştu'
    setErrors({ submit: errorMsg })
    if (options.onError) {
      options.onError(error)
    }
  } finally {
    setLoading(false)
  }
}

/**
 * Auto-retry mechanism for failed form submissions
 * @param {Function} submitFunction - The submit function to retry
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} delay - Delay between retries in ms (default: 1000)
 */
export const withRetry = async (submitFunction, maxRetries = 3, delay = 1000) => {
  let lastError
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await submitFunction()
    } catch (error) {
      lastError = error
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i))) // Exponential backoff
      }
    }
  }
  
  throw lastError
}

/**
 * Form field validation states
 */
export const getFieldValidationState = (fieldName, errors, touched = {}) => {
  const hasError = errors && errors[fieldName]
  const isTouched = touched[fieldName]
  
  return {
    isValid: !hasError && isTouched,
    isInvalid: hasError && isTouched,
    errorMessage: hasError ? errors[fieldName] : null
  }
}

/**
 * Real-time form validation
 * @param {Object} formData - Current form data
 * @param {Function} validator - Validation function
 * @param {Function} setErrors - Error state setter
 * @param {number} debounceMs - Debounce delay in ms (default: 300)
 */
export const useRealTimeValidation = (formData, validator, setErrors, debounceMs = 300) => {
  let timeoutId
  
  return () => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      const { errors } = validator(formData)
      setErrors(errors)
    }, debounceMs)
  }
}
