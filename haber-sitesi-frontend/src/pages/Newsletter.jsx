import { useState } from 'react'
import api from '../services/api'
import { sanitizeText } from '../utils/security'
import { NetworkErrorHandler, FormErrorDisplay, ConnectionStatus } from '../components/ErrorHandling'
import { FormSubmissionOverlay } from '../components/ProgressIndicators'
import { handleFormSubmission, withRetry } from '../utils/formUtils'
import { validateInput } from '../utils/security'

const Newsletter = () => {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
    const handleSubmit = async e => {
    e.preventDefault()
    
    // Clear previous messages
    setMsg('')
    setError('')
    setSuccess('')
    setValidationErrors({})
    
    // Input validation
    if (!email.trim()) {
      setValidationErrors({ email: 'E-posta adresi gereklidir.' })
      return
    }
    
    if (!validateInput.email(email)) {
      setValidationErrors({ email: 'Geçerli bir e-posta adresi girin.' })
      return
    }
    
    // Sanitize email
    const cleanEmail = sanitizeText(email.trim().toLowerCase())
    
    const submitFunction = async () => {
      return await api.subscribeNewsletter(cleanEmail)
    }

    await handleFormSubmission(
      () => withRetry(submitFunction, 3),
      setSubmitting,
      setValidationErrors,
      {
        successMessage: 'Başarıyla abone oldunuz!',
        errorMessage: 'Abonelik işlemi sırasında hata oluştu',
        onSuccess: (result) => {
          setSuccess(result.message || 'Başarıyla abone oldunuz!')
          setEmail('')
        },
        onError: (error) => {
          setError(error.message || 'Bir hata oluştu')
        }      }
    )
  }

  return (
    <div className="w-full">
      <ConnectionStatus />
      
      {/* Form validation errors */}
      <FormErrorDisplay errors={validationErrors} />
      
      {/* Success/Error messages */}
      {success && (
        <div className="mb-3 p-3 rounded-lg bg-green-100 text-green-800 border border-green-200 text-sm sm:text-base">
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-3 p-3 rounded-lg bg-red-100 text-red-800 border border-red-200 text-sm sm:text-base">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <input 
          type="email" 
          required 
          placeholder="E-posta adresinizi girin" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          disabled={submitting}
          className="flex-1 px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border-2 border-white/20 bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-4 focus:ring-white/20 focus:border-white/40 transition-all duration-200 text-sm sm:text-base disabled:opacity-50"
        />
        <button 
          type="submit"
          disabled={submitting}
          className="px-4 py-2 sm:px-6 sm:py-3 bg-white text-primary-600 rounded-lg sm:rounded-xl hover:bg-gray-100 transition-all duration-200 font-semibold whitespace-nowrap text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="spinner w-4 h-4 border-primary-600"></div>
              Gönderiliyor...
            </>
          ) : (
            'Abone Ol'
          )}
        </button>
      </form>      {msg && (
        <div className={`mt-2 sm:mt-3 p-2 sm:p-3 rounded-lg sm:rounded-xl text-sm sm:text-base ${
          msg.includes('Başarıyla') || msg.includes('başarılı') 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {msg}
        </div>
      )}

      {/* Form submission overlay */}
      <FormSubmissionOverlay 
        isVisible={submitting} 
        message="E-posta aboneliği işleniyor..." 
      />
    </div>
  )
}

export default Newsletter
