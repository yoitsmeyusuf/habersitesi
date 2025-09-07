import { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { validateInput } from '../utils/security'
import { useToast } from '../components/Toast'
import { LoadingButton } from '../components/Loading'
import { FormErrorDisplay } from '../components/ErrorHandling'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  
  const { showToast } = useToast()
  
  const email = searchParams.get('email')
  const token = searchParams.get('token')
  
  useEffect(() => {
    if (!email || !token) {
      showToast('Geçersiz şifre sıfırlama linki', 'error')
      navigate('/forgot-password')
    }
  }, [email, token, navigate, showToast])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setValidationErrors({})
    
    try {
      // Şifre validasyonu
      if (formData.newPassword.length < 6) {
        setValidationErrors({ newPassword: 'Şifre en az 6 karakter olmalıdır' })
        return
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        setValidationErrors({ confirmPassword: 'Şifreler eşleşmiyor' })
        return
      }
      
      const cleanPassword = validateInput.password(formData.newPassword)
      if (!cleanPassword) {
        setValidationErrors({ newPassword: 'Geçerli bir şifre girin' })
        return
      }
      
      await api.resetPassword(email, token, cleanPassword)
      setIsSuccess(true)
      showToast('Şifreniz başarıyla sıfırlandı', 'success')
      
    } catch (error) {
      const errorMsg = error.message || 'Şifre sıfırlanamadı'
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Şifre Sıfırlandı!</h2>
            <p className="text-gray-600 mb-6">
              Şifreniz başarıyla güncellendi. Artık yeni şifrenizle giriş yapabilirsiniz.
            </p>
            <Link 
              to="/login" 
              className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Giriş Yap
            </Link>
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
            Yeni Şifre Belirle
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {email} için yeni şifre oluşturun
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Yeni Şifre
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              value={formData.newPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.newPassword ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="En az 6 karakter"
            />
            {validationErrors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.newPassword}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Şifre Tekrar
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Şifrenizi tekrar girin"
            />
            {validationErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
            )}
          </div>

          <FormErrorDisplay errors={validationErrors} />

          <div>
            <LoadingButton
              type="submit"
              loading={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </LoadingButton>
          </div>

          <div className="text-center">
            <Link 
              to="/login" 
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

export default ResetPassword
