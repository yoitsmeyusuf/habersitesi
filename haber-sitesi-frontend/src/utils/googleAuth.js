// Google OAuth Utility
import logger from './logger'

// Google OAuth yapılandırması
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id'

class GoogleAuthManager {
  constructor() {
    this.isInitialized = false
    this.initPromise = null
  }

  // Google OAuth'u başlat
  async initialize() {
    if (this.isInitialized) return
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      // Google script'in yüklenip yüklenmediğini kontrol et
      if (typeof window.google === 'undefined') {
        logger.warn('Google OAuth script not loaded')
        reject(new Error('Google OAuth script not loaded'))
        return
      }

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: this.handleCredentialResponse.bind(this),
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        this.isInitialized = true
        logger.log('Google OAuth initialized successfully')
        resolve()
      } catch (error) {
        logger.error('Google OAuth initialization failed:', error)
        reject(error)
      }
    })

    return this.initPromise
  }

  // Google'dan gelen credential response'u işle
  handleCredentialResponse(response) {
    logger.log('Google credential response received:', response)
    
    // Custom event dispatch et ki Login component'i dinleyebilsin
    const event = new CustomEvent('googleAuthSuccess', {
      detail: { credential: response.credential }
    })
    window.dispatchEvent(event)
  }

  // Google ile giriş butonunu göster
  async renderSignInButton(elementId, options = {}) {
    await this.initialize()

    const defaultOptions = {
      type: 'standard',
      shape: 'rectangular',
      theme: 'outline',
      text: 'signin_with',
      size: 'large',
      width: '100%',
      ...options
    }

    try {
      window.google.accounts.id.renderButton(
        document.getElementById(elementId),
        defaultOptions
      )
      logger.log('Google Sign-In button rendered')
    } catch (error) {
      logger.error('Failed to render Google Sign-In button:', error)
      throw error
    }
  }

  // One Tap özelliğini göster
  async showOneTap() {
    await this.initialize()
    
    try {
      window.google.accounts.id.prompt()
      logger.log('Google One Tap prompted')
    } catch (error) {
      logger.error('Failed to show Google One Tap:', error)
    }
  }

  // Manuel olarak credential ile giriş yap
  async signInWithCredential(credential) {
    try {
      // Credential'ı doğrula
      if (!credential) {
        throw new Error('No credential provided')
      }

      // Custom event dispatch et
      const event = new CustomEvent('googleAuthSuccess', {
        detail: { credential }
      })
      window.dispatchEvent(event)

      logger.log('Manual Google sign-in triggered')
      return { success: true, credential }
    } catch (error) {
      logger.error('Manual Google sign-in failed:', error)
      throw error
    }
  }

  // Google script'in yüklenip yüklenmediğini kontrol et
  isGoogleScriptLoaded() {
    return typeof window.google !== 'undefined' && 
           window.google.accounts && 
           window.google.accounts.id
  }

  // Google OAuth'u temizle
  cleanup() {
    if (this.isInitialized && this.isGoogleScriptLoaded()) {
      try {
        window.google.accounts.id.cancel()
        logger.log('Google OAuth cleaned up')
      } catch (error) {
        logger.warn('Error during Google OAuth cleanup:', error)
      }
    }
    this.isInitialized = false
    this.initPromise = null
  }
}

// Singleton instance
const googleAuthManager = new GoogleAuthManager()

export default googleAuthManager

// Convenience functions
export const initializeGoogleAuth = () => googleAuthManager.initialize()
export const renderGoogleSignInButton = (elementId, options) => 
  googleAuthManager.renderSignInButton(elementId, options)
export const showGoogleOneTap = () => googleAuthManager.showOneTap()
export const signInWithCredential = (credential) => 
  googleAuthManager.signInWithCredential(credential)
export const cleanupGoogleAuth = () => googleAuthManager.cleanup()
