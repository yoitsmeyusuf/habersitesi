import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import ConfirmationModal from '../ConfirmationModal'
import Toast from '../Toast'

const CommentManager = ({ user }) => {
  const [comments, setComments] = useState([])
  const [filter, setFilter] = useState('all') // all, pending, approved, replies
  const [searchTerm, setSearchTerm] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmAction, setConfirmAction] = useState({ type: '', id: null })
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        limit: 20,
        status: filter,
        search: searchTerm
      }
      
      // If user is author, only fetch comments for their articles
      if (user?.role === 'author') {
        params.author = user.username
      }
      
      const response = await api.getComments(params)

      // Handle different response formats
      const commentsData = response.comments || response.data || response || []
      setComments(Array.isArray(commentsData) ? commentsData : [])
      setTotalPages(response.totalPages || response.data?.totalPages || 1)
    } catch {
      showToast('Yorumlar yüklenirken hata oluştu', 'error')
    } finally {
      setLoading(false)
    }
  }, [currentPage, filter, searchTerm, user])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const handleAction = (type, id) => {
    setConfirmAction({ type, id })
    setShowConfirm(true)
  }

  const confirmCommentAction = async () => {
    const { type, id } = confirmAction
    
    try {
      switch (type) {
        case 'approve':
          await api.approveComment(id)
          showToast('Yorum onaylandı')
          break
        case 'reject':
          await api.rejectComment(id)
          showToast('Yorum reddedildi')
          break
        case 'delete':
          await api.deleteComment(id)
          showToast('Yorum silindi')
          break
        default:
          break
      }
      
      fetchComments()
    } catch (error) {
      showToast(error.response?.data?.message || 'İşlem sırasında hata oluştu', 'error')
    }
    
    setShowConfirm(false)
    setConfirmAction({ type: '', id: null })
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { 
        class: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        text: '⏳ Bekliyor',
        icon: '⏳'
      },
      approved: { 
        class: 'bg-green-100 text-green-800 border border-green-200',
        text: '✅ Onaylandı',
        icon: '✅'
      },
      rejected: { 
        class: 'bg-red-100 text-red-800 border border-red-200',
        text: '❌ Reddedildi',
        icon: '❌'
      }
    }
    
    const config = statusConfig[status] || {
      class: 'bg-gray-100 text-gray-800 border border-gray-200',
      text: status || 'Bilinmiyor',
      icon: '❓'
    }
    
    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${config.class}`}>
        {config.text}
      </span>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Tarih belirtilmemiş'
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Yorum ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Yorumlar</option>
              <option value="approved">Onaylananlar</option>
              <option value="pending">Onay Bekleyenler</option>
              <option value="replies">Yanıtlar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            💬 {user?.role === 'author' ? 'Yorumlarım' : 'Yorum Yönetimi'}
          </h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {Array.isArray(comments) ? comments.length : 0} yorum
          </span>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Yorumlar yükleniyor...</p>
          </div>
        ) : !Array.isArray(comments) || comments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-gray-500 text-lg mb-2">Henüz yorum bulunamadı</p>
            <p className="text-gray-400 text-sm">
              {filter !== 'all' ? `"${filter}" filtresi için yorum yok` : 'Henüz hiç yorum yazılmamış'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment, index) => (
              <div key={comment.id || index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* Header with author info and status */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {comment.userAvatar ? (
                        <img src={comment.userAvatar} alt={comment.user}
                             className="w-8 h-8 rounded-full object-cover border" />
                      ) : (
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {(comment.user || 'A')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">
                          {comment.user || 'Anonim Kullanıcı'}
                        </h4>
                        {comment.isReply && (
                          <p className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded mt-1">
                            ↳ Yanıt {comment.parentId ? `(#${comment.parentId})` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      📅 {formatDate(comment.createdAt)}
                      {comment.approvedAt && (
                        <span className="ml-2 text-green-600">
                          ✅ {formatDate(comment.approvedAt)} - {comment.approvedBy}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(comment.approved ? 'approved' : 'pending')}
                    {comment.replyCount > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {comment.replyCount} yanıt
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Comment content */}
                <div className="mb-4 bg-gray-50 p-3 rounded-md">
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded">
                      📰 Haber: {comment.newsTitle || 'Haber başlığı yok'}
                    </span>
                  </div>
                  
                  {comment.isReply && comment.parentCommentText && (
                    <div className="mb-2 p-2 bg-white border-l-4 border-gray-300 rounded">
                      <span className="text-xs font-medium text-gray-500 block mb-1">↳ Yanıtlanan yorum:</span>
                      <p className="text-xs text-gray-600 italic">
                        {comment.parentCommentText.length > 100 
                          ? comment.parentCommentText.substring(0, 100) + '...' 
                          : comment.parentCommentText}
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-2">
                    <span className="text-xs font-medium text-gray-600 block mb-1">
                      {comment.isReply ? '💬 Yanıt:' : '💬 Yorum İçeriği:'}
                    </span>
                    <p className="text-gray-800 leading-relaxed text-sm bg-white p-2 rounded border-l-4 border-blue-200">
                      {comment.text || 'Yorum içeriği mevcut değil'}
                    </p>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                  {!comment.approved && (
                    <button
                      onClick={() => handleAction('approve', comment.id)}
                      className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      ✅ Onayla
                    </button>
                  )}
                  
                  {comment.approved && (
                    <button
                      onClick={() => handleAction('reject', comment.id)}
                      className="flex items-center gap-1 px-3 py-2 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                    >
                      ⚠️ Onayı Kaldır
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleAction('delete', comment.id)}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    🗑️ Sil
                  </button>
                  
                  <span className="text-xs text-gray-500 self-center ml-auto">
                    ID: {comment.id} {comment.isReply ? '(Yanıt)' : '(Ana Yorum)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6 space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
            >
              Önceki
            </button>
            
            <span className="px-3 py-1 text-sm text-gray-600">
              {currentPage} / {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmCommentAction}
        title={
          confirmAction.type === 'approve' ? 'Yorumu Onayla' :
          confirmAction.type === 'reject' ? 'Yorumu Reddet' :
          'Yorumu Sil'
        }
        message={
          confirmAction.type === 'approve' ? 'Bu yorumu onaylamak istediğinizden emin misiniz?' :
          confirmAction.type === 'reject' ? 'Bu yorumu reddetmek istediğinizden emin misiniz?' :
          'Bu yorumu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.'
        }
        type={confirmAction.type === 'delete' ? 'danger' : 'warning'}
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

export default CommentManager
