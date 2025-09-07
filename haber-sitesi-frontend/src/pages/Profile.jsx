import { useState, useEffect, useContext } from 'react'
import { UserContext } from '../contexts/UserContext'
import api from '../services/api'
import { validateInput, sanitizeText } from '../utils/security'
import { NetworkErrorHandler, FormErrorDisplay, ConnectionStatus } from '../components/ErrorHandling'
import { PageLoadingProgress, FormSubmissionOverlay } from '../components/ProgressIndicators'
import { handleFormSubmission, withRetry } from '../utils/formUtils'
import { getUserInitials } from '../utils/userUtils'

const Profile = () => {  const { user, updateUser, refreshUser } = useContext(UserContext)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})
    const [formData, setFormData] = useState({
    email: '',
    bio: '',
    profilePicture: '',
    firstName: '',
    lastName: '',
    displayName: ''
  })

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        bio: user.bio || '',
        profilePicture: user.profilePicture || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        displayName: user.displayName || ''
      })
    }
  }, [user])
  
  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Clear previous errors
    setError('')
    setValidationErrors({})
    setSuccess('')

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setValidationErrors({ profilePicture: 'Sadece JPG, PNG, GIF ve WebP formatlarına izin verilir' })
      return
    }

    // Check file size (max 2MB - backend limit)
    if (file.size > 2 * 1024 * 1024) {
      setValidationErrors({ profilePicture: 'Dosya boyutu 2MB\'dan büyük olamaz' })
      return
    }

    const submitFunction = async () => {
      return await api.uploadProfilePicture(file)
    }

    await handleFormSubmission(
      () => withRetry(submitFunction, 3),
      setUploadingImage,
      setValidationErrors,
      {
        successMessage: 'Profil resmi başarıyla yüklendi ve kaydedildi',
        errorMessage: 'Profil resmi yüklenirken hata oluştu',
        onSuccess: async (result) => {
          if (result.success) {
            setFormData(prev => ({ ...prev, profilePicture: result.url }))
            
            // Refresh user data from server to get latest info
            try {
              await refreshUser()
              setSuccess('Profil resmi başarıyla yüklendi ve kaydedildi')
            } catch (error) {
              console.warn('Failed to refresh user data:', error)
              // Fallback to local update
              const updatedUser = { ...user, profilePicture: result.url }
              updateUser(updatedUser)
              setSuccess('Profil resmi başarıyla yüklendi ve kaydedildi')
            }
          }
        },
        onError: (error) => {
          setError(error.message || 'Profil resmi yüklenirken hata oluştu')
        }      }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Clear previous errors
    setError('')
    setSuccess('')
    setValidationErrors({})    // Validate inputs
    const errors = {}
    
    // Email validasyonu: sadece email değiştiyse ve boş değilse kontrol et
    if (formData.email && formData.email.trim() !== '' && !validateInput.email(formData.email)) {
      errors.email = 'Geçerli bir email adresi girin'
    }

    if (formData.bio && formData.bio.length > 500) {
      errors.bio = 'Biografi 500 karakterden uzun olamaz'
    }

    if (formData.firstName && formData.firstName.length > 50) {
      errors.firstName = 'İsim 50 karakterden uzun olamaz'
    }

    if (formData.lastName && formData.lastName.length > 50) {
      errors.lastName = 'Soyisim 50 karakterden uzun olamaz'
    }

    if (formData.displayName && formData.displayName.length > 100) {
      errors.displayName = 'Görüntüleme ismi 100 karakterden uzun olamaz'
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }    const submitFunction = async () => {
      // Sadece değişen alanları gönder
      const changedData = {}
      
      // Sadece değişiklik olmuş alanları dahil et
      if (formData.email !== (user.email || '')) {
        changedData.email = formData.email.trim()
      }
      if (formData.bio !== (user.bio || '')) {
        changedData.bio = formData.bio ? sanitizeText(formData.bio) : ''
      }
      if (formData.firstName !== (user.firstName || '')) {
        changedData.firstName = formData.firstName ? sanitizeText(formData.firstName.trim()) : ''
      }
      if (formData.lastName !== (user.lastName || '')) {
        changedData.lastName = formData.lastName ? sanitizeText(formData.lastName.trim()) : ''
      }
      if (formData.displayName !== (user.displayName || '')) {
        changedData.displayName = formData.displayName ? sanitizeText(formData.displayName.trim()) : ''
      }
      
      // Eğer hiçbir değişiklik yoksa bilgi mesajı döndür
      if (Object.keys(changedData).length === 0) {
        return { message: 'Hiçbir değişiklik yapılmadı.' }
      }
      
      return await api.updateProfile(changedData)
    }

    await handleFormSubmission(
      submitFunction,
      setSaving,
      setValidationErrors,
      {
        successMessage: 'Profil başarıyla güncellendi',
        errorMessage: 'Profil güncellenirken hata oluştu',
        onSuccess: async (result) => {
          if (result.message && !result.message.includes('error')) {
            if (result.message === 'Hiçbir değişiklik yapılmadı.') {
              setSuccess('Hiçbir değişiklik yapılmadı.')
            } else {
              setSuccess('Profil başarıyla güncellendi')
              
              // Refresh user data from server to get latest info
              try {
                await refreshUser()
              } catch (error) {
                console.warn('Failed to refresh user data:', error)
                // Fallback to local update
                const updatedUser = {
                  ...user,
                  email: formData.email || user.email,
                  bio: formData.bio || user.bio,
                  firstName: formData.firstName || user.firstName,
                  lastName: formData.lastName || user.lastName,
                  displayName: formData.displayName || user.displayName
                }
                updateUser(updatedUser)
              }
            }
          }
        },
        onError: (error) => {
          setError(error.message || 'Profil güncellenirken hata oluştu')
        }
      }
    )
  }
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <div className="alert-error">Profil sayfasına erişmek için giriş yapmalısınız.</div>      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-10 lg:py-12 animate-fade-in">
      <ConnectionStatus />
      
      {/* Header Section */}
      <div className="text-center mb-8 sm:mb-10 lg:mb-12">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">Profil Ayarları</h1>
        <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
          Profil bilgilerinizi güncelleyin. {user.role === 'author' || user.role === 'admin' ? 'Biografi bilginiz haberlerinizde görüntülenecektir.' : ''}
        </p>
      </div>

      <div className="card shadow-2xl">        {error && (
          <div className="alert-error mb-6 sm:mb-8">
            {error}
          </div>
        )}

        {success && (
          <div className="alert-success mb-6 sm:mb-8">
            {success}
          </div>
        )}

        {/* Form validation errors */}
        <FormErrorDisplay errors={validationErrors} />

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 lg:space-y-10">
          {/* Profile Picture Section */}
          <div className="bg-gradient-to-r from-primary-50 to-accent-50 p-4 sm:p-6 lg:p-8 rounded-lg sm:rounded-xl lg:rounded-2xl border border-primary-100">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Profil Fotoğrafı</h2>
              <p className="text-gray-600 text-sm sm:text-base">Profilinizi kişiselleştirin</p>
            </div>
            
            <div className="flex flex-col items-center gap-6 sm:gap-8">
              <div className="relative group profile-picture">
                {formData.profilePicture ? (
                  <img
                    src={formData.profilePicture}
                    alt="Profil resmi"
                    className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full object-cover border-4 sm:border-6 lg:border-8 border-white shadow-3xl group-hover:shadow-red-lg transition-all duration-300"
                  />                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 bg-gradient-to-br from-primary-500 via-accent-500 to-primary-600 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl lg:text-5xl font-bold border-4 sm:border-6 lg:border-8 border-white shadow-3xl group-hover:shadow-red-lg transition-all duration-300">
                    {getUserInitials(user)}
                  </div>
                )}
                
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="spinner w-6 h-6 sm:w-8 sm:h-8 border-white"></div>
                      <span className="text-white text-xs sm:text-sm font-medium">Yükleniyor...</span>
                    </div>
                  </div>
                )}
                
                {/* Upload overlay on hover */}
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white mx-auto mb-1 sm:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-white text-xs sm:text-sm font-medium">Değiştir</span>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <input
                  type="file"
                  id="profilePicture"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
                <label
                  htmlFor="profilePicture"
                  className="cursor-pointer btn-gradient inline-flex items-center gap-2 sm:gap-3 px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-4 text-white rounded-lg sm:rounded-xl lg:rounded-2xl hover:shadow-red-lg transition-all duration-200 font-semibold transform hover:scale-105 disabled:opacity-50 text-sm sm:text-base"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {uploadingImage ? 'Yükleniyor...' : 'Fotoğraf Seç'}
                </label>
                <p className="text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4 max-w-md mx-auto">
                  JPG, PNG, GIF veya WebP formatında, maksimum 5MB boyutunda dosya yükleyebilirsiniz
                </p>
              </div>
            </div>
          </div>

          {/* Profile Information Section */}
          <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-200 space-y-6 sm:space-y-8">            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Kişisel Bilgiler</h2>
              <p className="text-gray-600 text-sm sm:text-base">Hesap detaylarınızı güncelleyin</p>
            </div>

            {/* Name Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="space-y-2 sm:space-y-3">
                <label className="block text-base sm:text-lg font-semibold text-gray-700">
                  İsim
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="input text-sm sm:text-base lg:text-lg py-3 sm:py-4"
                  placeholder="İsminizi girin"
                  maxLength="50"
                />
                {validationErrors.firstName && (
                  <p className="text-red-500 text-xs sm:text-sm">{validationErrors.firstName}</p>
                )}
              </div>

              <div className="space-y-2 sm:space-y-3">
                <label className="block text-base sm:text-lg font-semibold text-gray-700">
                  Soyisim
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="input text-sm sm:text-base lg:text-lg py-3 sm:py-4"
                  placeholder="Soyisminizi girin"
                  maxLength="50"
                />
                {validationErrors.lastName && (
                  <p className="text-red-500 text-xs sm:text-sm">{validationErrors.lastName}</p>
                )}
              </div>
            </div>

            {/* Display Name Section */}
            <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
              <label className="block text-base sm:text-lg font-semibold text-gray-700">
                Görüntüleme İsmi
                <span className="text-sm font-normal text-gray-500 ml-2">(İsteğe bağlı)</span>
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                className="input text-sm sm:text-base lg:text-lg py-3 sm:py-4"
                placeholder="Profilinizde görünmesini istediğiniz isim"
                maxLength="100"
              />
              {validationErrors.displayName && (
                <p className="text-red-500 text-xs sm:text-sm">{validationErrors.displayName}</p>
              )}
              <p className="text-xs sm:text-sm text-gray-500 bg-gray-50 p-2 sm:p-3 rounded-lg">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Boş bırakılırsa isim ve soyisim, onlar da yoksa kullanıcı adınız görüntülenecektir.
              </p>
            </div>

            {/* Email Section */}
            <div className="space-y-2 sm:space-y-3">
              <label className="block text-base sm:text-lg font-semibold text-gray-700">
                E-posta Adresi
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="input text-sm sm:text-base lg:text-lg py-3 sm:py-4"
                placeholder="email@example.com"
              />
              <p className="text-xs sm:text-sm text-gray-500 bg-gray-50 p-2 sm:p-3 rounded-lg">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                E-posta adresinizi değiştirirseniz tekrar doğrulamanız gerekecektir.
              </p>
            </div>

            {/* Bio Section - Only for authors and admins */}
            {(user.role === 'author' || user.role === 'admin') && (
              <div className="space-y-2 sm:space-y-3">
                <label className="block text-base sm:text-lg font-semibold text-gray-700">
                  Biografi
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  className="input resize-none text-sm sm:text-base lg:text-lg py-3 sm:py-4"
                  rows="4"
                  placeholder="Kendiniz hakkında kısa bir açıklama yazın..."
                  maxLength="500"
                />
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs sm:text-sm">
                  <div className="text-gray-500 bg-gray-50 p-2 sm:p-3 rounded-lg flex-1">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Bu bilgi haberlerinizde yazar bilgisi olarak görüntülenecektir.
                  </div>
                  <span className={`font-medium px-2 sm:px-3 py-1 rounded-full mt-2 sm:mt-0 sm:ml-4 ${formData.bio.length > 450 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                    {formData.bio.length}/500
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Account Information Display */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8 rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-200">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">Hesap Bilgileri</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="stats-card p-4 sm:p-6 rounded-lg sm:rounded-xl">
                <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-2">Kullanıcı Adı</label>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{user.username}</p>
              </div>
              
              <div className="stats-card p-4 sm:p-6 rounded-lg sm:rounded-xl">
                <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-2">Rol</label>
                <p className="text-lg sm:text-xl font-bold text-gray-900">
                  {user.role === 'admin' ? '🔧 Yönetici' : 
                   user.role === 'author' ? '✍️ Yazar' : '👤 Kullanıcı'}
                </p>
              </div>
              
              <div className="stats-card p-4 sm:p-6 rounded-lg sm:rounded-xl">
                <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-2">E-posta Durumu</label>
                <p className={`text-lg sm:text-xl font-bold flex items-center gap-2 ${user.emailConfirmed ? 'text-green-600' : 'text-amber-600'}`}>
                  {user.emailConfirmed ? (
                    <>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Doğrulanmış
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Doğrulanmamış
                    </>
                  )}
                </p>
              </div>
              
              <div className="stats-card p-4 sm:p-6 rounded-lg sm:rounded-xl">
                <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-2">Kayıt Tarihi</label>
                <p className="text-lg sm:text-xl font-bold text-gray-900">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : 'Bilinmiyor'}
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center pt-3 sm:pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-8 sm:px-10 lg:px-12 py-3 sm:py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-lg sm:rounded-xl lg:rounded-2xl hover:from-primary-600 hover:to-accent-600 transition-all duration-200 font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2 sm:gap-3">
                  <div className="spinner w-5 h-5 sm:w-6 sm:h-6 border-white"></div>
                  Kaydediliyor...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 sm:gap-3">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Profili Güncelle
                </span>
              )}
            </button>
          </div>        </form>
      </div>

      {/* Form submission overlay */}
      <FormSubmissionOverlay 
        isVisible={saving || uploadingImage} 
        message={uploadingImage ? "Profil resmi yükleniyor..." : "Profil güncelleniyor..."} 
      />
    </div>
  )
}

export default Profile
