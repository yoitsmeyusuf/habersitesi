import React, { useState, useEffect, useContext } from 'react'
import { UserContext } from '../../contexts/UserContext'
import api from '../../services/api'
import { useToast } from '../Toast'
import { LoadingButton } from '../Loading'
import { FormErrorDisplay } from '../ErrorHandling'

const FeaturedNewsManager = () => {
  const { user } = useContext(UserContext)
  const [featuredNews, setFeaturedNews] = useState([])
  const [allNews, setAllNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [errors, setErrors] = useState({})
  const [activeTab, setActiveTab] = useState('current') // 'current' | 'manage'
  const { showToast } = useToast()

  // Admin kontrolü
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadFeaturedNews(),
        loadAllNews()
      ])
    } catch {
      setErrors({ load: 'Veriler yüklenirken hata oluştu' })
    } finally {
      setLoading(false)
    }
  }

  const loadFeaturedNews = async () => {
    try {
      const response = await api.getFeaturedNewsList(5)
      setFeaturedNews(response.data || response.featuredNews || response || [])
    } catch {
      showToast('Featured haberler yüklenirken hata oluştu', 'error')
    }
  }

  const loadAllNews = async () => {
    try {
      const response = await api.getAllNewsForFeatured({
        search: searchTerm,
        category: selectedCategory,
        limit: 50
      })
      setAllNews(response.data || [])
    } catch {
      showToast('Haberler yüklenirken hata oluştu', 'error')
    }
  }

  // Search ve category değişiminde haberleri yeniden yükle
  useEffect(() => {
    if (activeTab === 'manage' && isAdmin) {
      const timer = setTimeout(() => {
        loadAllNews()
      }, 300) // Debounce
      return () => clearTimeout(timer)
    }
  }, [searchTerm, selectedCategory, activeTab, isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const makeFeatured = async (newsId, priority = 1) => {
    if (!isAdmin) {
      showToast('Bu işlem için admin yetkisi gerekli', 'error')
      return
    }

    try {
      setSaving(true)
      await api.makeFeatured(newsId, priority)
      showToast(`Haber ${priority}. öncelikle featured olarak işaretlendi!`, 'success')
      await loadData() // Verileri yenile
    } catch (error) {
      showToast('Featured yapılırken hata oluştu', 'error')
      setErrors({ make: error.message })
    } finally {
      setSaving(false)
    }
  }

  const removeFeatured = async (newsId) => {
    if (!isAdmin) {
      showToast('Bu işlem için admin yetkisi gerekli', 'error')
      return
    }

    try {
      setSaving(true)
      await api.removeFeatured(newsId)
      showToast('Haber featured\'dan çıkarıldı!', 'success')
      await loadData() // Verileri yenile
    } catch (error) {
      showToast('Featured\'dan çıkarılırken hata oluştu', 'error')
      setErrors({ remove: error.message })
    } finally {
      setSaving(false)
    }
  }

  const updatePriority = async (newsId, newPriority) => {
    if (!isAdmin) {
      showToast('Bu işlem için admin yetkisi gerekli', 'error')
      return
    }

    try {
      setSaving(true)
      await api.updateFeaturedPriority(newsId, newPriority)
      showToast('Öncelik güncellendi!', 'success')
      await loadData() // Verileri yenile
    } catch (error) {
      showToast('Öncelik güncellenirken hata oluştu', 'error')
      setErrors({ priority: error.message })
    } finally {
      setSaving(false)
    }
  }

  const getPriorityColor = (priority) => {
    const colors = {
      1: 'bg-red-100 text-red-800 border-red-200',
      2: 'bg-orange-100 text-orange-800 border-orange-200',
      3: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      4: 'bg-blue-100 text-blue-800 border-blue-200',
      5: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getPriorityLabel = (priority) => {
    const labels = {
      1: '🥇 En Yüksek',
      2: '🥈 Yüksek',
      3: '🥉 Orta',
      4: '📰 Düşük',
      5: '📄 En Düşük'
    }
    return labels[priority] || `Öncelik ${priority}`
  }

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 text-lg mb-2">🔒</div>
        <h3 className="text-red-800 font-semibold mb-1">Erişim Reddedildi</h3>
        <p className="text-red-600">Featured haber yönetimi sadece admin kullanıcılar için erişilebilir.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3">Featured haberler yükleniyor...</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="border-b border-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <span className="text-2xl mr-2">🌟</span>
            Featured Haber Yönetimi
          </h2>
          <p className="text-gray-600 mt-1">
            Ana sayfada görünecek featured haberleri yönetin (Maksimum 5 haber)
          </p>
        </div>
        
        {/* Tab Navigation */}
        <div className="px-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('current')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'current'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Mevcut Featured ({featuredNews.length}/5)
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manage'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Haber Yönetimi
            </button>
          </nav>
        </div>
      </div>

      <div className="p-6">
        <FormErrorDisplay errors={errors} />

        {/* Current Featured Tab */}
        {activeTab === 'current' && (
          <div>
            {featuredNews.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-4xl mb-4">📰</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz featured haber yok</h3>
                <p className="text-gray-500 mb-4">İlk featured haberinizi eklemek için "Haber Yönetimi" sekmesini kullanın</p>
                <button
                  onClick={() => setActiveTab('manage')}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Haber Yönetimine Git
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {featuredNews.map((news) => (
                  <div key={news.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(news.featuredPriority)}`}>
                            {getPriorityLabel(news.featuredPriority)}
                          </span>
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            {news.category}
                          </span>
                          <span className="text-xs text-gray-500">ID: {news.id}</span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{news.title}</h3>
                        
                        {news.summary && (
                          <p className="text-gray-600 mb-3">{news.summary.substring(0, 200)}...</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>👤 {news.author}</span>
                          <span>📅 {new Date(news.date).toLocaleDateString('tr-TR')}</span>
                          <span>🔗 {news.slug}</span>
                        </div>
                      </div>
                      
                      <div className="ml-6 flex flex-col gap-2">
                        {/* Öncelik Değiştirme */}
                        <select
                          value={news.featuredPriority}
                          onChange={(e) => updatePriority(news.id, parseInt(e.target.value))}
                          disabled={saving}
                          className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
                        >
                          {[1, 2, 3, 4, 5].map(priority => (
                            <option key={priority} value={priority}>
                              {getPriorityLabel(priority)}
                            </option>
                          ))}
                        </select>
                        
                        {/* Çıkar Butonu */}
                        <LoadingButton
                          onClick={() => removeFeatured(news.id)}
                          loading={saving}
                          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm disabled:opacity-50"
                          loadingText="Çıkarılıyor..."
                        >
                          Featured'dan Çıkar
                        </LoadingButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Manage Tab */}
        {activeTab === 'manage' && (
          <div>
            {/* Arama ve Filtreleme */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Haber Ara</label>
                  <input
                    type="text"
                    placeholder="Haber başlığı veya içerik ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategori Filtrele</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Tüm Kategoriler</option>
                    <option value="gündem">Gündem</option>
                    <option value="spor">Spor</option>
                    <option value="ekonomi">Ekonomi</option>
                    <option value="teknoloji">Teknoloji</option>
                    <option value="kültür">Kültür</option>
                    <option value="sağlık">Sağlık</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Haberler Listesi */}
            {allNews.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-3xl mb-3">🔍</div>
                <p className="text-gray-500">
                  {searchTerm || selectedCategory 
                    ? 'Arama kriterlerinize uygun haber bulunamadı' 
                    : 'Yayınlanmış haber bulunamadı'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allNews.map((news) => {
                  const isFeatured = featuredNews.some(f => f.id === news.id)
                  
                  return (
                    <div key={news.id} className={`border rounded-lg p-4 ${
                      isFeatured ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-500">ID: {news.id}</span>
                            <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
                              {news.category}
                            </span>
                            {isFeatured && (
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-medium">
                                ⭐ Featured
                              </span>
                            )}
                          </div>
                          
                          <h3 className="font-medium text-gray-900 mb-1">{news.title}</h3>
                          
                          {news.summary && (
                            <p className="text-sm text-gray-600 mb-2">{news.summary.substring(0, 150)}...</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>👤 {news.author}</span>
                            <span>📅 {new Date(news.publishedAt || news.date).toLocaleDateString('tr-TR')}</span>
                          </div>
                        </div>
                        
                        <div className="ml-4 flex flex-col gap-2">
                          {!isFeatured && featuredNews.length < 5 && (
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map(priority => (
                                <LoadingButton
                                  key={priority}
                                  onClick={() => makeFeatured(news.id, priority)}
                                  loading={saving}
                                  className={`text-xs px-2 py-1 rounded ${
                                    featuredNews.some(f => f.featuredPriority === priority)
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      : 'bg-primary-600 text-white hover:bg-primary-700'
                                  }`}
                                  disabled={featuredNews.some(f => f.featuredPriority === priority) || saving}
                                  title={`${priority}. öncelikle featured yap`}
                                >
                                  {priority}
                                </LoadingButton>
                              ))}
                            </div>
                          )}
                          
                          {!isFeatured && featuredNews.length >= 5 && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              Featured limit doldu (5/5)
                            </span>
                          )}
                          
                          {isFeatured && (
                            <LoadingButton
                              onClick={() => removeFeatured(news.id)}
                              loading={saving}
                              className="bg-red-600 text-white text-xs px-3 py-1 rounded hover:bg-red-700"
                              loadingText="Çıkarılıyor..."
                            >
                              Featured'dan Çıkar
                            </LoadingButton>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default FeaturedNewsManager
