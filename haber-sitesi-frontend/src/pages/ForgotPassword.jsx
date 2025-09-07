import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { validateInput } from '../utils/security'
import { useToast } from '../components/Toast'
import { LoadingButton } from '../components/Loading'
import { FormErrorDisplay } from '../components/ErrorHandling'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  
  const { showToast } = useToast()
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setValidationErrors({})
    
    try {
      // Email validasyonu
      const cleanEmail = validateInput.email(email)
      if (!cleanEmail) {
        setValidationErrors({ email: 'Geçerli bir email adresi girin' })
        return
      }
      
      await api.forgotPassword(cleanEmail)
      setIsSuccess(true)
      showToast('Şifre sıfırlama linki email adresinize gönderildi', 'success')
      
    } catch (error) {
      const errorMsg = error.message || 'Şifre sıfırlama talebi gönderilemedi'
      showToast(errorMsg, 'error')
      setValidationErrors({ submit: errorMsg })
    } finally {
      setIsLoading(false)
    }
  }
  
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Gönderildi!</h2>
            <p className="text-gray-600 mb-6">
              Şifre sıfırlama linki <strong>{email}</strong> adresine gönderildi. 
              Email'inizi kontrol edin ve linke tıklayarak yeni şifrenizi belirleyin.
            </p>
            <div className="space-y-3">
              <Link 
                to="/giris" 
                className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Giriş Sayfasına Dön
              </Link>
              <button
                onClick={() => {
                  setIsSuccess(false)
                  setEmail('')
                }}
                className="block w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Tekrar Gönder
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Şifremi Unuttum
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Email adresinizi girin, size şifre sıfırlama linki gönderelim
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Adresi
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="email@example.com"
            />
            {validationErrors.email && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
            )}
          </div>

          <FormErrorDisplay errors={validationErrors} />

          <div>
            <LoadingButton
              type="submit"
              loading={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Linki Gönder'}
            </LoadingButton>
          </div>

          <div className="text-center">
            <Link 
              to="/giris" 
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              ← Giriş sayfasına dön
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ForgotPassword
