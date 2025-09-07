import { useState } from 'react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import 'ckeditor5/ckeditor5.css'
import { 
  ClassicEditor,
  Bold,
  Italic,
  Underline,
  Link,
  Paragraph,
  Heading,
  List,
  Indent,
  BlockQuote,
  Table,
  MediaEmbed,
  Image,
  ImageCaption,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  Base64UploadAdapter,
  SourceEditing,
  Undo,
  Essentials
} from 'ckeditor5'
import { validateInput } from '../../utils/security'
import { getImageUrl } from '../../utils/environment'
import { useAdmin } from '../../hooks/useAdmin'
import api from '../../services/api'
import { handleFormSubmission } from '../../utils/formUtils'
import logger from '../../utils/logger'
import { useToast } from '../Toast'
import './NewsManager.css'

const NewsManager = ({ user }) => {
  const [showPreview, setShowPreview] = useState(true) // Preview toggle state
  const { state, actions } = useAdmin()
  const { news, categories, form, editId, loading, submitting, validationErrors } = state
  const { showToast } = useToast()
  
  const [categoryInput, setCategoryInput] = useState('')

  // Status helper functions
  const isApproved = (item) => {
    return item.approved === true || 
           item.approved === 1 || 
           item.isApproved === true || 
           item.isApproved === 1 || 
           item.status === 'approved' || 
           item.durum === 'onaylandi'
  }

  const isRejected = (item) => {
    return item.approved === false || 
           item.approved === 0 || 
           item.isApproved === false || 
           item.isApproved === 0 || 
           item.status === 'rejected' || 
           item.durum === 'reddedildi'
  }

  const isPending = (item) => {
    return !isApproved(item) && !isRejected(item)
  }

  // News form handlers
  const handleSubmit = async e => {
    e.preventDefault()
    
    if (!form.title?.trim()) {
      actions.setValidationErrors({ title: 'Başlık gerekli' })
      return
    }

    if (form.title.trim().length < 5) {
      actions.setValidationErrors({ title: 'Başlık en az 5 karakter olmalı' })
      return
    }

    if (!form.category?.trim()) {
      actions.setValidationErrors({ category: 'Kategori seçimi zorunlu' })
      return
    }

    try {
      // Input sanitization ve validation - safe version
      const sanitizedForm = {
        title: validateInput.text ? validateInput.text(form.title?.trim()) : form.title?.trim(),
        summary: validateInput.text ? validateInput.text(form.summary?.trim()) : form.summary?.trim(),
        image: form.image?.trim(), // Skip URL validation for now since it's working
        category: validateInput.text ? validateInput.text(form.category?.trim()) : form.category?.trim(),
        tags: validateInput.text ? validateInput.text(form.tags?.trim()) : form.tags?.trim(),
        author: user?.username || form.author?.trim(),
        featured: Boolean(form.featured)
      }

      // Author permission check
      if (editId && user.role === 'author') {
        const existingNews = news.find(n => n.id === editId)
        if (existingNews && existingNews.author !== user.username) {
          throw new Error('Bu yazıyı güncelleme yetkiniz yok.')
        }
      }

      // Content processing
      let content = validateInput.htmlContent ? validateInput.htmlContent(form.content || '') : form.content || ''
      content = await uploadEditorImages(content)

      const newsData = { 
        title: sanitizedForm.title,
        summary: sanitizedForm.summary || "",
        image: sanitizedForm.image || "",
        category: sanitizedForm.category,
        content: content,
        featured: user?.role === 'admin' ? Boolean(form.featured) : false,
        featuredPriority: user?.role === 'admin' && form.featured ? 1 : 0, // 1-5 arası, 1 en yüksek
        tags: sanitizedForm.tags || ""
      }
      
      // Backend API'ye uygun format - author otomatik eklenir backend'de
      
      const submitFunction = async () => {
        try {
          if (editId) {
            logger.log('Updating news with ID:', editId)
            return await api.updateNews(editId, newsData)
          } else {
            logger.log('Adding new news')
            return await api.addNews(newsData)
          }
        } catch (error) {
          logger.error('Submit function error:', error.message)
          throw error
        }
      }

      logger.log('Starting form submission process')

      await handleFormSubmission(
        submitFunction,
        actions.setSubmitting,
        actions.setValidationErrors,
        {
          successMessage: editId ? 'Haber başarıyla güncellendi!' : 'Haber başarıyla eklendi!',
          errorMessage: editId ? 'Haber güncellenirken hata oluştu.' : 'Haber eklenirken hata oluştu.',
          onSuccess: async () => {
            try {
              // Optimistic local update to reduce network calls
              if (editId) {
                const updatedList = news.map(n => (n.id === editId ? { ...n, ...newsData } : n))
                actions.setNews(updatedList)
              } else {
                // For newly created news, do a lightweight refresh once
                const refreshed = user?.role === 'admin' ? await api.getAdminAllNews() : await api.getNews()
                const processed = Array.isArray(refreshed) ? refreshed : (refreshed?.data || [])
                actions.setNews(user?.role === 'author' ? processed.filter(n => n.author === user.username) : processed)
              }
              actions.resetForm()
            } catch (error) {
              logger.error('Error updating local list:', error)
            }
          }
        }
      )
    } catch (error) {
      logger.error('Main try-catch error:', error)
      logger.error('Error type:', typeof error)
      logger.error('Error constructor:', error.constructor.name)
      logger.error('Error stack:', error.stack)
      actions.setValidationErrors({ 
        general: error.message || 'Form gönderilirken hata oluştu.' 
      })
    }
  }

  // CKEditor image upload
  const uploadEditorImages = async (content) => {
    const base64Regex = /<img[^>]+src="data:image\/[^;]+;base64,([^"]+)"/g
    let match
    const uploads = []

    while ((match = base64Regex.exec(content)) !== null) {
      uploads.push({
        base64: match[0],
        data: match[1]
      })
    }

    for (const upload of uploads) {
      try {
        const blob = await fetch(`data:image/jpeg;base64,${upload.data}`).then(r => r.blob())
        const file = new File([blob], 'editor-image.jpg', { type: 'image/jpeg' })
        const res = await api.uploadImage(file)
        let url = res.url
        if (url && url.startsWith('/')) {
          url = getImageUrl(url)
        }
        content = content.replace(upload.base64, `<img src="${url}"`)
      } catch (error) {
        logger.error('Error uploading editor image:', error)
      }
    }

    return content
  }

  // Form utilities
  const handleImageFile = async e => {
    const file = e.target.files[0]
    if (!file) return
    
    logger.log('📝 [NEWS] Starting image upload for news form')
    
    try {
      // Show loading state if available
      if (actions.setImageUploading) {
        actions.setImageUploading(true)
      }
      
      const res = await api.uploadImage(file)
      logger.log('📝 [NEWS] Image upload response:', res)
      
      let url = res.url
      if (url && url.startsWith('/')) {
        url = getImageUrl(url)
      }
      
      actions.updateForm({ image: url })
      logger.log('📝 [NEWS] Form updated with image URL:', url)
      
    } catch (err) {
      logger.error('📝 [NEWS] Image upload error:', err)
      showToast(`Resim yükleme hatası: ${err.message}`, 'error')
    } finally {
      // Hide loading state
      if (actions.setImageUploading) {
        actions.setImageUploading(false)
      }
    }
  }

  const handleEdit = async newsItem => {
    try {
      // Load full content from admin endpoint to avoid truncated list data
      const detail = await api.getAdminNewsDetail(newsItem.id)
      actions.setEditMode(newsItem.id, {
        title: detail.title ?? newsItem.title ?? '',
        summary: detail.summary ?? newsItem.summary ?? '',
        image: detail.image ?? newsItem.image ?? '',
        category: detail.category ?? newsItem.category ?? '',
        content: detail.content ?? newsItem.content ?? '',
        author: detail.author ?? newsItem.author ?? '',
        featured: Boolean(detail.featured ?? newsItem.featured),
        tags: detail.tags ?? newsItem.tags ?? ''
      })
    } catch (e) {
      logger.error('Edit load error:', e)
      // Fallback to existing item if detail fails
      actions.setEditMode(newsItem.id, {
        title: newsItem.title || '',
        summary: newsItem.summary || '',
        image: newsItem.image || '',
        category: newsItem.category || '',
        content: newsItem.content || '',
        author: newsItem.author || '',
        featured: newsItem.featured || false,
        tags: newsItem.tags || ''
      })
    }
  }

  // News approval handlers
  const handleApprove = async (newsId) => {
    if (!window.confirm('Bu haberi onaylamak istediğinizden emin misiniz?')) {
      return
    }

    try {
      actions.setSubmitting(true)
      await api.approveNews(newsId)
      // Local update instead of refetch
      const updated = news.map(n => n.id === newsId ? { ...n, approved: true, status: 'approved' } : n)
      actions.setNews(updated)
      actions.setValidationErrors({})
      
      // Show success message
      showToast('Haber başarıyla onaylandı!', 'success')
      
    } catch (error) {
      logger.error('Approve error:', error)
      actions.setValidationErrors({ general: error.message || 'Haber onaylanırken hata oluştu.' })
    } finally {
      actions.setSubmitting(false)
    }
  }

  const handleReject = async (newsId) => {
    const reason = prompt('Reddetme sebebi (isteğe bağlı):')
    if (reason === null) return // User cancelled
    
    if (!window.confirm('Bu haberi reddetmek istediğinizden emin misiniz?')) {
      return
    }

    try {
      actions.setSubmitting(true)
      await api.rejectNews(newsId, reason)
      // Local update instead of refetch
      const updated = news.map(n => n.id === newsId ? { ...n, approved: false, status: 'rejected' } : n)
      actions.setNews(updated)
      actions.setValidationErrors({})
      
      // Show success message
      showToast('Haber başarıyla reddedildi!', 'success')
      
    } catch (error) {
      logger.error('Reject error:', error)
      actions.setValidationErrors({ general: error.message || 'Haber reddedilirken hata oluştu.' })
    } finally {
      actions.setSubmitting(false)
    }
  }

  const handleDelete = async (newsId, newsTitle) => {
    if (!window.confirm(`"${newsTitle}" başlıklı haberi kalıcı olarak silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`)) {
      return
    }

    try {
      actions.setSubmitting(true)
      await api.deleteNews(newsId)
      // Local removal instead of refetch
      const remaining = news.filter(n => n.id !== newsId)
      actions.setNews(remaining)
      actions.setValidationErrors({})
      
      // Show success message
      showToast('Haber başarıyla silindi!', 'success')
      
    } catch (error) {
      logger.error('Delete error:', error)
      actions.setValidationErrors({ general: error.message || 'Haber silinirken hata oluştu.' })
    } finally {
      actions.setSubmitting(false)
    }
  }

  // Category management
  const handleAddCategory = async e => {
    e.preventDefault()
    if (!categoryInput || !categoryInput.trim()) {
      return
    }

    const submitFunction = async () => {
      return await api.createCategory({ name: categoryInput.trim() })
    }

    await handleFormSubmission(
      submitFunction,
      actions.setSubmitting,
      actions.setValidationErrors,
      {
        successMessage: 'Kategori başarıyla eklendi!',
        errorMessage: 'Kategori eklenirken hata oluştu.',
        onSuccess: async () => {
          try {
            const categoriesData = await api.getCategories()
            actions.setCategories(Array.isArray(categoriesData) ? categoriesData : categoriesData?.data || [])
            setCategoryInput('')
          } catch (error) {
            logger.error('Error reloading categories:', error)
          }
        }
      }
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* News Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {editId ? '📝 Haber Düzenle' : '📰 Yeni Haber Ekle'}
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              {editId ? 'Mevcut haberi düzenleyin' : 'Yeni bir haber yazısı oluşturun'}
            </p>
          </div>
          {editId && (
            <button
              type="button"
              onClick={() => actions.clearEditMode()}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              ✖️ İptal Et
            </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {validationErrors.general && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {validationErrors.general}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Başlık *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => actions.updateForm({ title: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Haber başlığını girin..."
            />
            {validationErrors.title && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.title}</p>
            )}
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Özet
            </label>
            <textarea
              value={form.summary}
              onChange={e => actions.updateForm({ summary: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Haber özetini girin..."
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Görsel
            </label>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFile}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {form.image && (
                <img 
                  src={form.image} 
                  alt="Preview" 
                  className="max-w-xs h-32 object-cover rounded-md border"
                />
              )}
            </div>
          </div>

          {/* Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori *
              </label>
              <select
                value={form.category}
                onChange={e => actions.updateForm({ category: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Kategori seçin</option>
                {categories.map(cat => (
                  <option key={cat.id || cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {validationErrors.category && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.category}</p>
              )}
            </div>

            {user?.role === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manşet
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={e => actions.updateForm({ featured: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Manşete ekle</span>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Etiketler
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={e => actions.updateForm({ tags: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Etiketleri virgül ile ayırın..."
            />
          </div>

          {/* Content Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İçerik
            </label>
            <div className="border border-gray-300 rounded-md">
              <CKEditor
                editor={ClassicEditor}
                data={form.content}
                onChange={(event, editor) => {
                  const data = editor.getData()
                  actions.updateForm({ content: data })
                }}
                config={{
                  licenseKey: 'GPL', // GPL lisansı kullanıyoruz
                  plugins: [
                    Essentials,
                    Bold,
                    Italic,
                    Underline,
                    Link,
                    Paragraph,
                    Heading,
                    List,
                    Indent,
                    BlockQuote,
                    Table,
                    MediaEmbed,
                    Image,
                    ImageCaption,
                    ImageStyle,
                    ImageToolbar,
                    ImageUpload,
                    Base64UploadAdapter,
                    SourceEditing,
                    Undo
                  ],
                  toolbar: [
                    'heading', '|',
                    'bold', 'italic', 'underline', 'link', '|',
                    'bulletedList', 'numberedList', '|',
                    'outdent', 'indent', '|',
                    'imageUpload', 'blockQuote', 'insertTable', 'mediaEmbed', '|',
                    'sourceEditing', '|',
                    'undo', 'redo'
                  ],
                  heading: {
                    options: [
                      { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
                      { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
                      { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
                      { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
                      { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' }
                    ]
                  },
                  image: {
                    toolbar: [
                      'imageTextAlternative',
                      'imageStyle:inline',
                      'imageStyle:block',
                      'imageStyle:side'
                    ],
                    styles: [
                      'full',
                      'side',
                      'alignLeft',
                      'alignCenter',
                      'alignRight'
                    ]
                  },
                  // We avoid CKEditor simpleUpload to prevent preflight; uploads handled via api.uploadImage
                }}
              />
            </div>
          </div>

          {/* Real-time Preview */}
          {form.content && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  📄 Yazı Önizlemesi
                </label>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-gray-500">
                    {form.content.replace(/<[^>]*>/g, '').length} karakter
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                  >
                    {showPreview ? '🙈 Gizle' : '👁️ Göster'}
                  </button>
                </div>
              </div>
              {showPreview && (
                <div className="border-2 border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-1">
                  <div className="content-preview bg-white rounded-md p-4 relative">
                    {form.content.replace(/<[^>]*>/g, '').length > 1000 && (
                      <div className="absolute top-2 right-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        📜 Kaydırabilirsiniz
                      </div>
                    )}
                    <div 
                      dangerouslySetInnerHTML={{ __html: form.content }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            {editId && (
              <button
                type="button"
                onClick={() => actions.resetForm()}
                className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Kaydediliyor...' : (editId ? 'Güncelle' : 'Kaydet')}
            </button>
          </div>
        </form>
      </div>

      {/* Quick Category Add */}
      {user?.role === 'admin' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Hızlı Kategori Ekle</h3>
          <form onSubmit={handleAddCategory} className="flex space-x-4">
            <input
              type="text"
              value={categoryInput}
              onChange={e => setCategoryInput(e.target.value)}
              placeholder="Kategori adı..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Ekle
            </button>
          </form>
        </div>
      )}

      {/* News List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              📋 {user?.role === 'author' ? 'Haberlerim' : 'Tüm Haberler'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {news.length} haber • 
              <span className="text-green-600 ml-1">
                {news.filter(n => isApproved(n)).length} onaylı
              </span>
              <span className="text-yellow-600 ml-1">
                {news.filter(n => isPending(n)).length} beklemede
              </span>
              <span className="text-red-600 ml-1">
                {news.filter(n => isRejected(n)).length} reddedildi
              </span>
            </p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Başlık
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Yazar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {news.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                      {item.title}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.author}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {item.featured && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          ⭐ Manşet
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isApproved(item) ? 'bg-green-100 text-green-800' :
                        isRejected(item) ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {isApproved(item) ? '✅ Onaylandı' :
                         isRejected(item) ? '❌ Reddedildi' : '⏳ Beklemede'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        Düzenle
                      </button>
                      
                      {/* Delete button - for admin or author's own news */}
                      {(user?.role === 'admin' || (user?.role === 'author' && item.author === user.username)) && (
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
                          className="text-red-600 hover:text-red-900 transition-colors font-medium"
                          disabled={submitting}
                        >
                          🗑️ Sil
                        </button>
                      )}
                      
                      {user?.role === 'admin' && isPending(item) && (
                        <>
                          <button
                            onClick={() => handleApprove(item.id)}
                            className="text-green-600 hover:text-green-900 transition-colors font-medium"
                            disabled={submitting}
                          >
                            ✅ Onayla
                          </button>
                          <button
                            onClick={() => handleReject(item.id)}
                            className="text-red-600 hover:text-red-900 transition-colors font-medium"
                            disabled={submitting}
                          >
                            ❌ Reddet
                          </button>
                        </>
                      )}
                      
                      {user?.role === 'admin' && isApproved(item) && (
                        <button
                          onClick={() => handleReject(item.id)}
                          className="text-red-600 hover:text-red-900 transition-colors font-medium"
                          disabled={submitting}
                        >
                          ❌ Reddet
                        </button>
                      )}
                      
                      {user?.role === 'admin' && isRejected(item) && (
                        <button
                          onClick={() => handleApprove(item.id)}
                          className="text-green-600 hover:text-green-900 transition-colors font-medium"
                          disabled={submitting}
                        >
                          ✅ Onayla
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default NewsManager
