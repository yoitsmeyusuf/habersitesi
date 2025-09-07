import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../services/api'
import { useToast } from '../components/Toast'
import { LoadingButton, Spinner } from '../components/Loading'

const EmailVerification = () => {
  const [searchParams] = useSearchParams()
  const [verificationState, setVerificationState] = useState('verifying') // verifying, success, error
  const [isResending, setIsResending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  const { showToast } = useToast()
  
  const email = searchParams.get('email')
  const token = searchParams.get('token')
  
  const verifyEmail = useCallback(async () => {
    try {
      await api.confirmEmail(email, token)
      setVerificationState('success')
      showToast('Email adresiniz başarıyla doğrulandı!', 'success')
    } catch (error) {
      setVerificationState('error')
      setErrorMessage(error.message || 'Email doğrulama başarısız')
      showToast('Email doğrulama başarısız', 'error')
    }
  }, [email, token, showToast])
  
  useEffect(() => {
    if (!email || !token) {
      setVerificationState('error')
      setErrorMessage('Geçersiz doğrulama linki')
      return
    }
    
    verifyEmail()
  }, [email, token, verifyEmail])
  
  const handleResendVerification = async () => {
    if (!email) return
    
    setIsResending(true)
    try {
      await api.resendConfirmation(email)
      showToast('Doğrulama emaili tekrar gönderildi', 'success')
    } catch (error) {
      showToast(error.message || 'Email gönderilemedi', 'error')
    } finally {
      setIsResending(false)
    }
  }
  
  if (verificationState === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 text-center">
          <Spinner size="xl" />
          <h2 className="text-2xl font-bold text-gray-900">Email Doğrulanıyor...</h2>
          <p className="text-gray-600">Lütfen bekleyin, email adresiniz doğrulanıyor.</p>
        </div>
      </div>
    )
  }
  
  if (verificationState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Doğrulandı!</h2>
            <p className="text-gray-600 mb-6">
              {email} adresi başarıyla doğrulandı. Artık hesabınızı kullanabilirsiniz.
            </p>
            <Link 
              to="/giris" 
              className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors mb-3"
            >
              Giriş Yap
            </Link>
            <Link 
              to="/" 
              className="block w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors"
            >
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </div>
    )
  }
  
  if (verificationState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Doğrulama Başarısız</h2>
            <p className="text-gray-600 mb-6">
              {errorMessage}
            </p>
            
            {email && (
              <div className="space-y-3">
                <button
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 mb-3"
                >
                  {isResending ? 'Gönderiliyor...' : 'Doğrulama Emaili Tekrar Gönder'}
                </button>
                <Link 
                  to="/giris" 
                  className="block w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Giriş Sayfasına Dön
                </Link>
              </div>
            )}
            
            {!email && (
              <Link 
                to="/kayit" 
                className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Kayıt Ol
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }
}

export default EmailVerification
