import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import ConfirmationModal from '../ConfirmationModal'
import Toast from '../Toast'

const SettingsManager = () => {
  const [settings, setSettings] = useState({
    site_name: '',
    site_description: '',
    site_keywords: '',
    site_logo: '',
    site_favicon: '',
    contact_email: '',
    contact_phone: '',
    contact_address: '',
    social_facebook: '',
    social_twitter: '',
    social_instagram: '',
    social_youtube: '',
    analytics_code: '',
    ads_header: '',
    ads_sidebar: '',
    ads_footer: '',
    maintenance_mode: false,
    user_registration: true,
    comment_moderation: true,
    max_upload_size: 5,
    allowed_file_types: 'jpg,jpeg,png,gif,webp',
    smtp_host: '',
    smtp_port: '',
    smtp_username: '',
    smtp_password: '',
    smtp_encryption: 'tls'
  })
  
  const [activeTab, setActiveTab] = useState('general')
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmAction, setConfirmAction] = useState('')

  const tabs = [
    { id: 'general', name: 'Genel Ayarlar', icon: '⚙️' },
    { id: 'contact', name: 'İletişim', icon: '📞' },
    { id: 'social', name: 'Sosyal Medya', icon: '📱' },
    { id: 'ads', name: 'Reklamlar', icon: '📢' },
    { id: 'upload', name: 'Dosya Yükleme', icon: '📁' },
  { id: 'email', name: 'E-posta Ayarları', icon: '✉️' },
  { id: 'moderation', name: 'Moderasyon', icon: '🔒' },
    { id: 'advanced', name: 'Gelişmiş', icon: '🔧' }
  ]

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.getSettings()
      setSettings(prev => ({ ...prev, ...response.data, ...response }))
    } catch {
      showToast('Ayarlar yüklenirken hata oluştu', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
    // Preload banned words for moderation tab
    ;(async () => {
      try {
        const words = await api.getBannedWords()
        setSettings(prev => ({ ...prev, banned_words: words }))
      } catch { /* ignore if not admin */ }
    })()
  }, [fetchSettings])

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const handleInputChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      await api.updateSettings(settings)
      showToast('Ayarlar başarıyla kaydedildi')
    } catch (error) {
      showToast(error.message || 'Ayarlar kaydedilirken hata oluştu', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSpecialAction = (action) => {
    setConfirmAction(action)
    setShowConfirm(true)
  }

  const confirmSpecialAction = async () => {
    try {
      switch (confirmAction) {
        case 'clearCache':
          await api.clearCache()
          showToast('Önbellek temizlendi')
          break
        case 'resetSettings':
          await api.resetSettings()
          await fetchSettings()
          showToast('Ayarlar sıfırlandı')
          break
        case 'exportSettings': {
          const response = await api.exportSettings()
          const blob = new Blob([JSON.stringify(response.data || response, null, 2)], { type: 'application/json' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'settings.json'
          a.click()
          window.URL.revokeObjectURL(url)
          showToast('Ayarlar dışa aktarıldı')
          break
        }
        default:
          break
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'İşlem sırasında hata oluştu', 'error')
    }
    
    setShowConfirm(false)
    setConfirmAction('')
  }

  const renderGeneralSettings = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Site Adı
        </label>
        <input
          type="text"
          value={settings.site_name}
          onChange={(e) => handleInputChange('site_name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Site adını girin"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Site Açıklaması
        </label>
        <textarea
          value={settings.site_description}
          onChange={(e) => handleInputChange('site_description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="3"
          placeholder="Site açıklamasını girin"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Anahtar Kelimeler (SEO)
        </label>
        <input
          type="text"
          value={settings.site_keywords}
          onChange={(e) => handleInputChange('site_keywords', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="haber, güncel, türkiye"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Site Logo URL
        </label>
        <input
          type="url"
          value={settings.site_logo}
          onChange={(e) => handleInputChange('site_logo', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com/logo.png"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Favicon URL
        </label>
        <input
          type="url"
          value={settings.site_favicon}
          onChange={(e) => handleInputChange('site_favicon', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com/favicon.ico"
        />
      </div>
    </div>
  )

  const renderContactSettings = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          İletişim E-postası
        </label>
        <input
          type="email"
          value={settings.contact_email}
          onChange={(e) => handleInputChange('contact_email', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="info@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Telefon
        </label>
        <input
          type="tel"
          value={settings.contact_phone}
          onChange={(e) => handleInputChange('contact_phone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="+90 212 123 45 67"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Adres
        </label>
        <textarea
          value={settings.contact_address}
          onChange={(e) => handleInputChange('contact_address', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="3"
          placeholder="Tam adres bilgisi"
        />
      </div>
    </div>
  )

  const renderSocialSettings = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Facebook URL
        </label>
        <input
          type="url"
          value={settings.social_facebook}
          onChange={(e) => handleInputChange('social_facebook', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://facebook.com/sayfaniz"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Twitter URL
        </label>
        <input
          type="url"
          value={settings.social_twitter}
          onChange={(e) => handleInputChange('social_twitter', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://twitter.com/hesabiniz"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Instagram URL
        </label>
        <input
          type="url"
          value={settings.social_instagram}
          onChange={(e) => handleInputChange('social_instagram', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://instagram.com/hesabiniz"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          YouTube URL
        </label>
        <input
          type="url"
          value={settings.social_youtube}
          onChange={(e) => handleInputChange('social_youtube', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://youtube.com/channel/kanaliniz"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Google Analytics Kodu
        </label>
        <textarea
          value={settings.analytics_code}
          onChange={(e) => handleInputChange('analytics_code', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="4"
          placeholder="Google Analytics tracking kodu"
        />
      </div>
    </div>
  )

  const renderAdsSettings = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Header Reklamları
        </label>
        <textarea
          value={settings.ads_header}
          onChange={(e) => handleInputChange('ads_header', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="4"
          placeholder="Header bölümünde gösterilecek reklam kodu"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sidebar Reklamları
        </label>
        <textarea
          value={settings.ads_sidebar}
          onChange={(e) => handleInputChange('ads_sidebar', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="4"
          placeholder="Sidebar'da gösterilecek reklam kodu"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Footer Reklamları
        </label>
        <textarea
          value={settings.ads_footer}
          onChange={(e) => handleInputChange('ads_footer', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="4"
          placeholder="Footer'da gösterilecek reklam kodu"
        />
      </div>
    </div>
  )

  const renderUploadSettings = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Maksimum Dosya Boyutu (MB)
        </label>
        <input
          type="number"
          value={settings.max_upload_size}
          onChange={(e) => handleInputChange('max_upload_size', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="1"
          max="100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          İzin Verilen Dosya Türleri
        </label>
        <input
          type="text"
          value={settings.allowed_file_types}
          onChange={(e) => handleInputChange('allowed_file_types', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="jpg,jpeg,png,gif,webp"
        />
        <p className="text-sm text-gray-500 mt-1">
          Dosya uzantılarını virgülle ayırarak yazın
        </p>
      </div>
    </div>
  )

  const renderEmailSettings = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          SMTP Host
        </label>
        <input
          type="text"
          value={settings.smtp_host}
          onChange={(e) => handleInputChange('smtp_host', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="smtp.gmail.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          SMTP Port
        </label>
        <input
          type="number"
          value={settings.smtp_port}
          onChange={(e) => handleInputChange('smtp_port', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="587"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          SMTP Kullanıcı Adı
        </label>
        <input
          type="text"
          value={settings.smtp_username}
          onChange={(e) => handleInputChange('smtp_username', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="email@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          SMTP Şifre
        </label>
        <input
          type="password"
          value={settings.smtp_password}
          onChange={(e) => handleInputChange('smtp_password', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Şifreleme
        </label>
        <select
          value={settings.smtp_encryption}
          onChange={(e) => handleInputChange('smtp_encryption', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="tls">TLS</option>
          <option value="ssl">SSL</option>
          <option value="none">Yok</option>
        </select>
      </div>
    </div>
  )

  const [bwInput, setBwInput] = useState('')
  const renderModerationSettings = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Yasaklı Kelimeler (Banned Words)
        </label>
        <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
          <input
            type="text"
            value={bwInput}
            onChange={(e) => setBwInput(e.target.value)}
            className="w-full md:flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Kelime ekle..."
          />
          <button
            type="button"
            onClick={() => {
              if (!bwInput.trim()) return
              const w = (settings.banned_words || [])
              if (!w.includes(bwInput.trim())) {
                setSettings(prev => ({ ...prev, banned_words: [...(prev.banned_words || []), bwInput.trim()] }))
                setBwInput('')
              }
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >Ekle</button>
        </div>
        <p className="text-sm text-gray-500 mt-1">Aşağıdan listeyi düzenleyebilir veya silebilirsiniz.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(settings.banned_words || []).map((w, idx) => (
          <span key={`${w}-${idx}`} className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 px-3 py-1 rounded-full">
            {w}
            <button
              type="button"
              onClick={() => setSettings(prev => ({ ...prev, banned_words: (prev.banned_words || []).filter(x => x !== w) }))}
              className="text-red-600 hover:text-red-800"
              aria-label={`Sil ${w}`}
            >✕</button>
          </span>
        ))}
      </div>
      <div>
        <button
          type="button"
          onClick={async () => {
            try {
              await api.updateBannedWords(settings.banned_words || [])
              showToast('Yasaklı kelimeler güncellendi')
            } catch (e) {
              showToast(e.message || 'Güncellenemedi', 'error')
            }
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        >Kaydet</button>
      </div>
    </div>
  )

  const renderAdvancedSettings = () => (
    <div className="space-y-4">
      <div className="flex items-center">
        <input
          type="checkbox"
          id="maintenance_mode"
          checked={settings.maintenance_mode}
          onChange={(e) => handleInputChange('maintenance_mode', e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="maintenance_mode" className="text-sm text-gray-700">
          Bakım Modu (Site geçici olarak kapatılır)
        </label>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="user_registration"
          checked={settings.user_registration}
          onChange={(e) => handleInputChange('user_registration', e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="user_registration" className="text-sm text-gray-700">
          Kullanıcı Kaydına İzin Ver
        </label>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="comment_moderation"
          checked={settings.comment_moderation}
          onChange={(e) => handleInputChange('comment_moderation', e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="comment_moderation" className="text-sm text-gray-700">
          Yorum Moderasyonu (Yorumlar onay bekler)
        </label>
      </div>

      <div className="border-t pt-4 mt-6">
        <h4 className="font-medium text-gray-900 mb-4">Sistem İşlemleri</h4>
        <div className="space-y-2">
          <button
            onClick={() => handleSpecialAction('clearCache')}
            className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mr-2"
          >
            Önbelleği Temizle
          </button>
          
          <button
            onClick={() => handleSpecialAction('exportSettings')}
            className="w-full md:w-auto bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 mr-2"
          >
            Ayarları Dışa Aktar
          </button>
          
          <button
            onClick={() => handleSpecialAction('resetSettings')}
            className="w-full md:w-auto bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Ayarları Sıfırla
          </button>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralSettings()
      case 'contact': return renderContactSettings()
      case 'social': return renderSocialSettings()
      case 'ads': return renderAdsSettings()
      case 'upload': return renderUploadSettings()
      case 'email': return renderEmailSettings()
  case 'advanced': return renderAdvancedSettings()
  case 'moderation': return renderModerationSettings()
      default: return renderGeneralSettings()
    }
  }

  if (loading) {
    return <div className="text-center py-8">Ayarlar yükleniyor...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-700 to-gray-900 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">⚙️ Site Ayarları</h2>
            <p className="text-gray-300">
              Sitenizin genel ayarlarını ve konfigürasyonunu yönetin
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Aktif Sekme</div>
            <div className="text-lg font-bold">
              {tabs.find(t => t.id === activeTab)?.icon} {tabs.find(t => t.id === activeTab)?.name}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <span>{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSave} className="p-6">
          {renderTabContent()}
          
          <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? '⏳ Kaydediliyor...' : '💾 Ayarları Kaydet'}
            </button>
          </div>
        </form>
      </div>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmSpecialAction}
        title={
          confirmAction === 'clearCache' ? 'Önbelleği Temizle' :
          confirmAction === 'resetSettings' ? 'Ayarları Sıfırla' :
          confirmAction === 'exportSettings' ? 'Ayarları Dışa Aktar' :
          'Onayla'
        }
        message={
          confirmAction === 'clearCache' ? 'Tüm önbellek dosyaları temizlenecek. Bu işlem performansı geçici olarak etkileyebilir.' :
          confirmAction === 'resetSettings' ? 'Tüm ayarlar varsayılan değerlere sıfırlanacak. Bu işlem geri alınamaz.' :
          confirmAction === 'exportSettings' ? 'Mevcut ayarlar JSON dosyası olarak indirilecek.' :
          'Bu işlemi gerçekleştirmek istediğinizden emin misiniz?'
        }
        type={confirmAction === 'resetSettings' ? 'danger' : 'warning'}
      />

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  )
}

export default SettingsManager
