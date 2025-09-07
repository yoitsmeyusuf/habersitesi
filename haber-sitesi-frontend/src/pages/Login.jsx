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

const Login = () => {
  const [user, setUserInput] = useState('')
  const [pass, setPass] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  
  const navigate = useNavigate()
  const userContext = useContext(UserContext)
  const { login } = userContext || {}
  const { showToast } = useToast()
  // const { signInWithGoogle } = useGoogleAuth() // Removed - not used directly
  
  logger.log('Login page - UserContext:', userContext)
  
  // Google Login Callback Functions
  const handleGoogleSuccess = async (authData) => {
    try {
      logger.log('Google authentication successful:', authData.user)
      
      // Context'e kullanıcıyı kaydet
      login(authData.user, authData.token)
      
      showToast('Google ile giriş başarılı!', 'success')
      
      // Warning mesajı varsa göster
      if (authData.warning) {
        setTimeout(() => {
          showToast(authData.warning, 'warning')
        }, 1000)
      }
      
      // Yönlendirme
      setTimeout(() => {
        if (authData.user?.role === 'author' || authData.user?.role === 'admin') {
          navigate('/yonetim')
        } else {
          navigate('/profil')
        }
      }, 1500)
      
    } catch (error) {
      logger.error('Google login context error:', error)
      showToast('Giriş sonrası bir hata oluştu', 'error')
    }
  }

  const handleGoogleError = (error) => {
    logger.error('Google authentication error:', error)
    showToast(error.message || 'Google ile giriş başarısız', 'error')
  }
  
  const handleResendEmailVerification = async () => {
    if (!userEmail) return
    
    setIsResendingEmail(true)
    try {
      await api.resendConfirmation(userEmail)
      showToast('Doğrulama emaili tekrar gönderildi', 'success')
    } catch (error) {
      showToast(error.message || 'Email gönderilemedi', 'error')
    } finally {
      setIsResendingEmail(false)
    }
  }
  
  const handleLogin = async e => {
    e.preventDefault()
    setValidationErrors({})
    
    // Input validation
    const errors = {}
    if (!user || !pass) {
      errors.general = 'Kullanıcı adı ve şifre gereklidir'
    } else {
      if (!validateInput.username(user)) {
        errors.username = 'Geçersiz kullanıcı adı formatı'
      }
      if (pass.length < 3) {
        errors.password = 'Şifre en az 3 karakter olmalıdır'
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setIsLoading(true)
    
    try {
      // Sanitize inputs
      const cleanUser = sanitizeText(user)
      logger.log('Login: Attempting login')
      
      const result = await api.login(cleanUser, pass)
      logger.log('Login: API response received')
      
      if (result.success) {
        // Email doğrulama kontrolü - backend'den gelen field'ı kullan
        const isEmailVerified = result.user?.emailVerified || result.user?.emailConfirmed || false
        logger.log('Login: Email verification status:', isEmailVerified)
        
        if (result.user && result.user.email && !isEmailVerified) {
          setNeedsEmailVerification(true)
          setUserEmail(result.user.email)
          showToast('Email adresinizi doğrulamanız gerekiyor. Lütfen gelen kutunuzu kontrol edin.', 'warning')
          setValidationErrors({ 
            submit: 'Email doğrulama gerekli. Doğrulama emaili göndermek için aşağıdaki butona tıklayın.' 
          })
          return
        }
        
        // State'i hemen güncelle - UserContext login metodunu kullan
        logger.log('Login: User authentication successful')
        
        // Önce API'den gelen user'ı kullan, token'dan parse etmeye çalışma
        const finalUser = result.user || {
          id: 1,
          name: 'admin',
          email: 'admin@example.com',
          role: 'admin'
        }
        logger.log('Login: User data prepared')
        
        // Kullanıcı bilgisini context'e set et
        logger.log('Login: Setting user context')
        login(finalUser, result.token)
        logger.log('Login: User context updated successfully')
        
        // Başarı mesajı göster
        showToast('Giriş başarılı!', 'success')
        
        // Role kontrolü yaparak yönlendir - kısa delay ile state güncellenmesini bekle
        setTimeout(() => {
          if (finalUser?.role === 'author' || finalUser?.role === 'admin') {
            navigate('/yonetim')
          } else {
            navigate('/')
          }
        }, 50)
      } else {
        showToast('Giriş başarısız: ' + (result.message || 'Bilinmeyen hata'), 'error')
      }
    } catch (error) {
      // Handle backend validation errors
      if (error.errors && typeof error.errors === 'object') {
        setValidationErrors(error.errors)
      } else {
        showToast(error.message || 'Giriş sırasında bir hata oluştu', 'error')
      }
      logger.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 px-3 sm:px-4 lg:px-6">
      <ConnectionStatus />
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-red-xl p-6 sm:p-8 w-full max-w-md border border-primary-100 animate-slide-up relative">
        {isLoading && <FormSubmissionOverlay message="Giriş yapılıyor..." />}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Giriş Yap</h1>
          <p className="text-gray-600 text-sm sm:text-base">Hesabınıza erişim sağlayın</p>        </div>
        
        <FormErrorDisplay errors={validationErrors} />
        
        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Kullanıcı Adı</label>
            <input
              type="text"
              placeholder="Kullanıcı adınızı girin"
              value={user}
              onChange={e => setUserInput(e.target.value)}
              className="w-full px-3 py-3 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 text-sm sm:text-base"
              required
            />
          </div>
            <div className="relative">
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Şifre</label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Şifrenizi girin"
              value={pass}
              onChange={e => setPass(e.target.value)}
              className="w-full px-3 py-3 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 text-sm sm:text-base pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
              aria-label="Şifreyi göster/gizle"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-3.172-3.172a4 4 0 015.656 0M21 21l-18-18" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Email Doğrulama Uyarısı */}
          {needsEmailVerification && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-yellow-800 font-medium">Email Doğrulama Gerekli</span>
              </div>
              <p className="text-yellow-700 text-sm mb-3">
                {userEmail} adresine gönderilen doğrulama linkine tıklayın.
              </p>
              <button
                type="button"
                onClick={handleResendEmailVerification}
                disabled={isResendingEmail}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 text-sm"
              >
                {isResendingEmail ? 'Gönderiliyor...' : 'Doğrulama Emaili Tekrar Gönder'}
              </button>
            </div>
          )}
          
          <LoadingButton
            type="submit"
            loading={isLoading}
            className="w-full py-3 sm:py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-lg sm:rounded-xl hover:from-primary-600 hover:to-accent-600 focus:from-primary-600 focus:to-accent-600 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200 font-semibold text-base sm:text-lg shadow-red hover:shadow-red-lg disabled:opacity-50 disabled:cursor-not-allowed"
            loadingText="Giriş yapılıyor..."
            aria-label="Giriş yap"
          >
            Giriş Yap
          </LoadingButton>        </form>
        
        {/* Google ile Giriş Bölümü */}
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
          <Link to="/forgot-password" className="block text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200 text-sm sm:text-base">
            Şifremi unuttum
          </Link>
          <div className="text-gray-500 text-xs sm:text-sm">
            Hesabınız yok mu? 
            <Link to="/kayit" className="text-primary-600 hover:text-primary-700 font-medium ml-1 transition-colors duration-200">
              Kayıt olun
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
