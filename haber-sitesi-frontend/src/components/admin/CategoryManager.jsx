import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import { validateInput } from '../../utils/security'
import ConfirmationModal from '../ConfirmationModal'
import Toast from '../Toast'

const CategoryManager = () => {
  const [categories, setCategories] = useState([])
  const [formData, setFormData] = useState({
    name: ''
  })
  const [editingId, setEditingId] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [categoryToDelete, setCategoryToDelete] = useState(null) // Silinecek kategori bilgisi
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const [loading, setLoading] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState({ show: false, current: 0, total: 0 })

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.getCategories()
      setCategories(response.data || response || [])
    } catch {
      showToast('Kategoriler yüklenirken hata oluştu', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!validateInput.text(formData.name)) {
      showToast('Lütfen kategori adını doldurun', 'error')
      return
    }

    try {
      setLoading(true)
      
      // Backend sadece name alanını bekliyor
      const categoryData = {
        name: validateInput.text(formData.name.trim())
      }

      if (editingId) {
        await api.updateCategory(editingId, categoryData)
        showToast('Kategori başarıyla güncellendi')
      } else {
        await api.createCategory(categoryData)
        showToast('Kategori başarıyla eklendi')
      }

      setFormData({ name: '' })
      setEditingId(null)
      await fetchCategories()
    } catch (error) {
      console.error('Category operation error:', error)
      
      // Check if error has response property (axios error)
      if (error.response?.data?.message) {
        showToast(error.response.data.message, 'error')
      } 
      // Check if error is a simple Error object
      else if (error.message) {
        showToast(error.message, 'error')
      } 
      // Check if error is a string
      else if (typeof error === 'string') {
        showToast(error, 'error')
      } 
      // Default error message
      else {
        showToast('İşlem sırasında hata oluştu', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (category) => {
    setFormData({
      name: category.name || ''
    })
    setEditingId(category.id)
  }

  const handleDeleteConfirm = async (id) => {
    try {
      // Önce kategoriyi ve haber sayısını öğren
      const category = categories.find(cat => cat.id === id)
      
      // API'den o kategorideki haber sayısını al
      const newsResponse = await api.getNews({ category: category?.name, limit: 1 })
      const newsCount = newsResponse.total || 0
      
      setCategoryToDelete({ ...category, newsCount })
      setDeleteId(id)
      setShowConfirm(true)
    } catch {
      showToast('Kategori bilgisi alınırken hata oluştu', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      // Progress başlat
      if (categoryToDelete?.newsCount > 0) {
        setDeleteProgress({ show: true, current: 0, total: categoryToDelete.newsCount })
      }
      
      await api.deleteCategory(deleteId)
      showToast('Kategori ve tüm haberleri başarıyla silindi')
      await fetchCategories()
    } catch (error) {
      showToast(error.response?.data?.message || error.message || 'Silme işlemi sırasında hata oluştu', 'error')
    } finally {
      setDeleteProgress({ show: false, current: 0, total: 0 })
      setShowConfirm(false)
      setDeleteId(null)
      setCategoryToDelete(null)
    }
  }

  const cancelEdit = () => {
    setFormData({ name: '' })
    setEditingId(null)
  }

  return (
    <div className="space-y-6">
      {/* Form Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              {editingId ? '📝 Kategori Düzenle' : '📂 Yeni Kategori Ekle'}
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              {editingId ? 'Mevcut kategoriyi düzenleyin' : 'Sadece kategori adını girin'}
            </p>
          </div>
          {editingId && (
            <button
              onClick={cancelEdit}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              ✖️ İptal Et
            </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📝 Kategori Adı *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: Spor, Teknoloji, Sağlık..."
                required
                minLength={2}
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">2-50 karakter arasında olmalıdır</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '⏳ Kaydediliyor...' : (editingId ? '💾 Güncelle' : '➕ Kategori Ekle')}
            </button>
          </div>
        </form>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">📋 Kategoriler</h3>
            <p className="text-sm text-gray-500 mt-1">
              {categories.length} kategori mevcut
            </p>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Kategoriler yükleniyor...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📂</div>
            <p className="text-gray-500 text-lg mb-2">Henüz kategori bulunamadı</p>
            <p className="text-gray-400 text-sm">İlk kategorinizi yukarıdaki formu kullanarak ekleyin</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-lg">
                      📂 {category.name}
                    </h4>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    ID: {category.id}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      ✏️ Düzenle
                    </button>
                    <button
                      onClick={() => handleDeleteConfirm(category.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      🗑️ Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false)
          setDeleteId(null)
          setCategoryToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Kategoriyi Sil"
        message={
          categoryToDelete?.newsCount > 0 
            ? `🚨 DİKKAT! "${categoryToDelete.name}" kategorisinde ${categoryToDelete.newsCount} haber bulunuyor.\n\n⚠️ KATEGORİYİ SİLDİĞİNİZDE:\n• Bu kategorideki TÜM HABERLER silinecek\n• Haberlerin yorumları da silinecek\n• Bu işlem GERİ ALINMAZ!\n\n🗑️ Toplam ${categoryToDelete.newsCount} haber kalıcı olarak silinecek.\n\nYine de devam etmek istediğinizden emin misiniz?`
            : `"${categoryToDelete?.name}" kategorisini silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz.`
        }
        type="danger"
      />

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />

      {/* Delete Progress Modal */}
      {deleteProgress.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              🗑️ Kategori Siliniyor...
            </h3>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                "{categoryToDelete?.name}" kategorisindeki haberler siliniyor...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${deleteProgress.total > 0 ? (deleteProgress.current / deleteProgress.total) * 100 : 0}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 text-center">
                {deleteProgress.current} / {deleteProgress.total} haber silindi
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CategoryManager
