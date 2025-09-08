import { useState, useRef, useEffect, useCallback } from 'react'
import api from '../services/api'

const AdvancedImageUpload = ({ onImageUploaded, className = '', multiple = false, resize = false }) => {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [gallery, setGallery] = useState([])
  const [showGallery, setShowGallery] = useState(false)
  const [galleryPage, setGalleryPage] = useState(1)
  const [previewImages, setPreviewImages] = useState([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (showGallery) {
      loadGallery()
    }
  }, [showGallery, loadGallery])

  const loadGallery = useCallback(async () => {
    try {
      const result = await api.getImageGallery(galleryPage, 12)
      if (result.images) {
        setGallery(prev => galleryPage === 1 ? result.images : [...prev, ...result.images])
      }
    } catch (error) {
      console.error('Galeri yüklenemedi:', error)
    }
  }, [galleryPage])

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return

    // Create preview images
    const previews = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }))
    setPreviewImages(previews)

    setUploading(true)
    try {
      let result

      if (multiple && files.length > 1) {
        // Multiple image upload
        result = await api.uploadMultipleImages(files)
        if (result.urls) {
          onImageUploaded(result.urls)
        }
      } else {
        // Single image upload
        const file = files[0]
        
        if (resize) {
          result = await api.resizeImage(file, 800, 600)
        } else {
          result = await api.uploadImage(file)
        }
        
        if (result.url) {
          onImageUploaded(multiple ? [result.url] : result.url)
        }
      }

      if (!result || (!result.url && !result.urls)) {
        throw new Error('Upload başarısız')
      }

      // Clear previews after successful upload
      setPreviewImages([])
      
    } catch (error) {
      console.error('Upload hatası:', error)
      alert('Resim yükleme sırasında hata oluştu: ' + error.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const removePreview = (index) => {
    setPreviewImages(prev => prev.filter((_, i) => i !== index))
  }

  const selectFromGallery = (imageUrl) => {
    onImageUploaded(multiple ? [imageUrl] : imageUrl)
    setShowGallery(false)
  }

  return (
    <div className={`${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200
          ${dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}
          ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:bg-gray-50'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />
        
        {uploading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-primary-600 font-medium">Yükleniyor...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700 mb-2">
                {multiple ? 'Resimleri sürükleyin veya seçin' : 'Resmi sürükleyin veya seçin'}
              </p>
              <p className="text-sm text-gray-500">
                PNG, JPG, GIF, WEBP desteklenir (Max 10MB)
                {multiple && ' - En fazla 5 resim'}
                {resize && ' - Otomatik boyutlandırılacak (800x600)'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Preview Images */}
      {previewImages.length > 0 && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold mb-4">Önizleme:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {previewImages.map((preview, index) => (
              <div key={index} className="relative bg-white rounded-xl shadow-md overflow-hidden">
                <img
                  src={preview.preview}
                  alt={preview.name}
                  className="w-full h-32 object-cover"
                />
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-700 truncate">{preview.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(preview.size)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removePreview(index)
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gallery Toggle */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => setShowGallery(!showGallery)}
          className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all duration-200 font-medium"
        >
          {showGallery ? 'Galeriyi Gizle' : 'Mevcut Resimlerden Seç'}
        </button>
      </div>

      {/* Image Gallery */}
      {showGallery && (
        <div className="mt-6 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold mb-4">Resim Galerisi</h4>
          {gallery.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {gallery.map((image, index) => (
                <div
                  key={index}
                  className="relative bg-gray-100 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 group"
                  onClick={() => selectFromGallery(image.url)}
                >
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2">
                    <p className="truncate">{image.name}</p>
                    <p>{formatFileSize(image.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Henüz resim yüklenmemiş</p>
          )}
          
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setGalleryPage(prev => prev + 1)}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Daha Fazla Yükle
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedImageUpload
