import React, { useState } from 'react'
import SEOHead from '../components/SEOHead'
import { ConnectionStatus, FormErrorDisplay } from '../components/ErrorHandling'
import { validateInput, sanitizeText } from '../utils/security'
import api from '../services/api'

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.name.trim()) {
      errors.name = 'Ad Soyad gereklidir'
    } else if (formData.name.length < 2) {
      errors.name = 'Ad Soyad en az 2 karakter olmalıdır'
    }

    if (!formData.email.trim()) {
      errors.email = 'E-posta adresi gereklidir'
    } else if (!validateInput.email(formData.email)) {
      errors.email = 'Geçerli bir e-posta adresi giriniz'
    }

    if (!formData.subject.trim()) {
      errors.subject = 'Konu gereklidir'
    } else if (formData.subject.length < 5) {
      errors.subject = 'Konu en az 5 karakter olmalıdır'
    }

    if (!formData.message.trim()) {
      errors.message = 'Mesaj gereklidir'
    } else if (formData.message.length < 10) {
      errors.message = 'Mesaj en az 10 karakter olmalıdır'
    } else if (formData.message.length > 1000) {
      errors.message = 'Mesaj 1000 karakterden uzun olamaz'
    }

    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate form
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setSubmitting(true)
    setValidationErrors({})

    try {
      // Sanitize inputs
      const sanitizedData = {
        name: sanitizeText(formData.name).slice(0, 100),
        email: formData.email.trim().toLowerCase(),
        subject: sanitizeText(formData.subject).slice(0, 200),
        message: sanitizeText(formData.message).slice(0, 1000)
      }

      // Send contact message
      const response = await api.submitContactForm(sanitizedData)
      
      if (response.success !== false) {
        setSuccess('Mesajınız başarıyla gönderildi! En kısa sürede size dönüş yapacağız.')
        setFormData({ name: '', email: '', subject: '', message: '' })
      } else {
        setError(response.message || 'Mesaj gönderilirken bir hata oluştu.')
      }
    } catch (err) {
      console.error('Contact form error:', err)
      setError('Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white min-h-screen">
      <ConnectionStatus />
      
      {/* SEO Head */}
      <SEOHead
        title="İletişim - HaberSitesi"
        description="HaberSitesi ile iletişime geçin. Sorularınız, önerileriniz ve geri bildirimleriniz için bize ulaşın."
        keywords="iletişim, haber sitesi, geri bildirim, öneri, soru"
        url={`${window.location.origin}/iletisim`}
      />

      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-10 lg:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            İletişim
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Bizimle iletişime geçin. Sorularınızı, önerilerinizi ve geri bildirimlerinizi bekliyoruz.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Contact Form */}
          <div className="card p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              Mesaj Gönder
            </h2>

            {success && (
              <div className="alert-success mb-6">
                {success}
              </div>
            )}

            {error && (
              <div className="alert-error mb-6">
                {error}
              </div>
            )}

            <FormErrorDisplay errors={validationErrors} />

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`input ${validationErrors.name ? 'border-red-500' : ''}`}
                    placeholder="Adınız ve soyadınız"
                    maxLength="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    E-posta Adresi *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`input ${validationErrors.email ? 'border-red-500' : ''}`}
                    placeholder="ornek@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Konu *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className={`input ${validationErrors.subject ? 'border-red-500' : ''}`}
                  placeholder="Mesajınızın konusu"
                  maxLength="200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mesajınız *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows="6"
                  className={`input resize-none ${validationErrors.message ? 'border-red-500' : ''}`}
                  placeholder="Mesajınızı buraya yazın..."
                  maxLength="1000"
                />
                <div className="text-right text-sm text-gray-500 mt-1">
                  {formData.message.length}/1000
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl hover:from-primary-600 hover:to-accent-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="spinner w-5 h-5 border-white"></div>
                    Gönderiliyor...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Mesajı Gönder
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            {/* Contact Details */}
            <div className="card p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                İletişim Bilgileri
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">E-posta</h3>
                    <p className="text-gray-600">info@habersitesi.com</p>
                    <p className="text-gray-600">editor@habersitesi.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Telefon</h3>
                    <p className="text-gray-600">+90 (212) 555 0123</p>
                    <p className="text-gray-500 text-sm">Pazartesi - Cuma: 09:00 - 18:00</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Adres</h3>
                    <p className="text-gray-600">
                      HaberSitesi Medya A.Ş.<br />
                      Kadıköy, İstanbul<br />
                      Türkiye
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Link */}
            <div className="card p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Sıkça Sorulan Sorular
              </h3>
              <p className="text-gray-600 mb-4">
                Sorularınızın cevaplarını SSS bölümümüzde bulabilirsiniz.
              </p>
              <a 
                href="/sss"
                className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold"
              >
                SSS'yi İncele
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            {/* Response Time */}
            <div className="bg-gradient-to-r from-primary-50 to-accent-50 p-6 rounded-xl border border-primary-100">
              <h3 className="font-bold text-primary-700 mb-2">📧 Yanıt Süresi</h3>
              <p className="text-primary-600 text-sm">
                Mesajlarınızı genellikle 24 saat içinde yanıtlıyoruz. 
                Acil durumlar için telefon numaramızı kullanabilirsiniz.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact
