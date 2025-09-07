import { useState, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { UserContext } from '../contexts/UserContext'
import { validateInput, sanitizeText } from '../utils/security'
import { useToast } from '../components/Toast'
import { LoadingButton } from '../components/Loading'
import { FormErrorDisplay, ConnectionStatus } from '../components/ErrorHandling'
import { FormSubmissionOverlay } from '../components/ProgressIndicators'
import GoogleAuth from '../components/GoogleAuth'
import logger from '../utils/logger'

const Register = () => {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const navigate = useNavigate()
  const { showToast } = useToast()
  const userContext = useContext(UserContext)
  const { login } = userContext || {}
  
  logger.log('Register page - UserContext:', userContext)
  
  // Google Register Success Handler
  const handleGoogleSuccess = async (authData) => {
    try {
      logger.log('Google registration successful:', authData.user)
      
      // Context'e kullanıcıyı kaydet
      login(authData.user, authData.token)
      
      showToast('Google ile kayıt başarılı!', 'success')
      
      // Warning mesajı varsa göster
      if (authData.warning) {
        setTimeout(() => {
          showToast(authData.warning, 'warning')
        }, 1000)
      }
      
      // Yönlendirme
      setTimeout(() => {
        navigate('/profile')
      }, 1500)
      
    } catch (error) {
      logger.error('Google register context error:', error)
      showToast('Kayıt sonrası bir hata oluştu', 'error')
    }
  }

  const handleGoogleError = (error) => {
    logger.error('Google registration error:', error)
    showToast(error.message || 'Google ile kayıt başarısız', 'error')
  }

  const handleRegister = async e => {
    e.preventDefault()
    setValidationErrors({})

    // Client-side doğrulama
    const validation = validateFormData({ username, email, password })
    if (validation.errors.length > 0) {
      const errorObj = {}
      validation.errors.forEach(error => {
        errorObj[error.field] = error.message
      })
      setValidationErrors(errorObj)
      return
    }

    // Input sanitization
    const sanitizedData = {
      username: sanitizeText(username),
      email: sanitizeText(email),
      password: password // Şifre sanitize edilmez
    }

    // Security validation
    const securityValidation = {
      username: validateInput.username(sanitizedData.username),
      email: validateInput.email(sanitizedData.email),
      password: validateInput.password(sanitizedData.password)
    }

    if (!securityValidation.username || 
        !securityValidation.email || 
        !securityValidation.password) {
      setValidationErrors({
        username: !securityValidation.username ? 'Geçersiz kullanıcı adı formatı' : '',
        email: !securityValidation.email ? 'Geçersiz email formatı' : '',
        password: !securityValidation.password ? 'Şifre en az 8 karakter, büyük-küçük harf ve rakam içermelidir' : ''
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await api.register(sanitizedData)
      if (result.success) {
        login(result.user, result.token)
        showToast('Kayıt başarılı! Hoş geldiniz!', 'success')
        navigate('/')
      } else {
        showToast('Kayıt başarısız: ' + (result.message || 'Bilinmeyen hata'), 'error')
      }
    } catch (error) {
      logger.error('Register error:', error)
      showToast('Kayıt sırasında hata oluştu', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const validateFormData = (data) => {
    const errors = []
    
    if (!data.username || data.username.length < 3) {
      errors.push({ field: 'username', message: 'Kullanıcı adı en az 3 karakter olmalıdır' })
    }
    
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push({ field: 'email', message: 'Geçerli bir e-posta adresi girin' })
    }
    
    if (!data.password || data.password.length < 6) {
      errors.push({ field: 'password', message: 'Şifre en az 6 karakter olmalıdır' })
    }
    
    return { errors }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              Kayıt Ol
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Hesabınızı oluşturun ve haber dünyasına katılın
            </p>
          </div>

          <FormErrorDisplay errors={validationErrors} />
          <ConnectionStatus />

          <form onSubmit={handleRegister} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Kullanıcı Adı</label>
              <input
                type="text"
                placeholder="Kullanıcı adınızı girin"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-3 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 text-sm sm:text-base"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">E-posta</label>
              <input
                type="email"
                placeholder="E-posta adresinizi girin"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-3 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 text-sm sm:text-base"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Şifre</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Şifrenizi girin"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-3 sm:px-4 sm:py-3 pr-12 rounded-lg sm:rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 text-sm sm:text-base"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700 transition-colors duration-200"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M14.12 14.12l1.415 1.415M14.12 14.12L9.878 9.878m4.242 4.242L8.464 8.464" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-gradient-to-r from-primary-50 to-accent-50 rounded-lg sm:rounded-xl border border-primary-200">
              <div className="flex items-center gap-2 sm:gap-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-xs sm:text-sm text-primary-800 font-medium">
                    Güvenlik Bilgisi
                  </p>
                  <p className="text-xs text-primary-600 mt-1">
                    Bilgileriniz 256-bit SSL şifreleme ile korunmaktadır.
                  </p>
                </div>
              </div>
            </div>

            <LoadingButton
              type="submit"
              loading={isLoading}
              className="w-full py-3 sm:py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-lg sm:rounded-xl hover:from-primary-600 hover:to-accent-600 transition-all duration-200 font-semibold text-base sm:text-lg shadow-red hover:shadow-red-lg disabled:opacity-50 disabled:cursor-not-allowed"
              loadingText="Kayıt olunuyor..."
            >
              Kayıt Ol
            </LoadingButton>
          </form>
          
          {/* Google ile Kayıt Ol Bölümü */}
          <div className="mt-6 sm:mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">veya</span>
              </div>
            </div>
            
            {/* Google Authentication Component */}
            <div className="mt-6">
              <GoogleAuth 
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                className="w-full"
              />
            </div>
          </div>

          <div className="mt-4 sm:mt-6 text-center space-y-2">
            <div className="text-gray-500 text-xs sm:text-sm">
              Zaten hesabınız var mı? 
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium ml-1 transition-colors duration-200">
                Giriş yapın
              </Link>
            </div>
          </div>
        </div>
      </div>

      {isLoading && <FormSubmissionOverlay message="Kayıt işlemi yapılıyor..." />}
    </div>
  )
}

export default Register
