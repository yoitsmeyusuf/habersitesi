import React, { useState } from 'react'
import { sanitizeText } from '../utils/security'
import { FormErrorDisplay } from './ErrorHandling'

const CommentReplySystem = ({ 
  comment, 
  user, 
  onReplySubmit, 
  onLoadReplies,
  emailVerified = true,
  submitting = false 
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [showReplies, setShowReplies] = useState(false)
  const [repliesLoading, setRepliesLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

  const handleReplySubmit = async (e) => {
    e.preventDefault()
    setValidationErrors({})

    if (!user) {
      setValidationErrors({ auth: 'Yanıt vermek için giriş yapmalısınız.' })
      return
    }

    if (!emailVerified) {
      setValidationErrors({ email: 'E-posta adresinizi doğrulamadan yorum yapamazsınız.' })
      return
    }

    if (!replyText.trim()) {
      setValidationErrors({ text: 'Yanıt metni boş olamaz.' })
      return
    }

    if (replyText.trim().length < 2) {
      setValidationErrors({ text: 'Yanıt en az 2 karakter olmalıdır.' })
      return
    }

    if (replyText.length > 1000) {
      setValidationErrors({ text: 'Yanıt en fazla 1000 karakter olabilir.' })
      return
    }

    try {
      // Show replies immediately; optimistic update done in parent
      setShowReplies(true)
      await onReplySubmit(comment.id, sanitizeText(replyText.trim()))
      setReplyText('')
      setShowReplyForm(false)
    } catch (error) {
      setValidationErrors({ submit: error.message })
    }
  }

  const handleLoadReplies = async () => {
    if (comment.replies && comment.replies.length > 0) {
      setShowReplies(!showReplies)
      return
    }

    setRepliesLoading(true)
    try {
      await onLoadReplies(comment.id)
      setShowReplies(true)
    } catch (error) {
      console.error('Error loading replies:', error)
    } finally {
      setRepliesLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Az önce'
    if (diffMins < 60) return `${diffMins} dakika önce`
    if (diffHours < 24) return `${diffHours} saat önce`
    if (diffDays < 7) return `${diffDays} gün önce`
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="mt-4 pl-4 border-l-2 border-gray-100">
      {/* Comment Actions */}
      <div className="flex items-center space-x-4 mb-3">
        <button
          onClick={() => setShowReplyForm(!showReplyForm)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          disabled={submitting || !comment.approved}
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          Yanıtla
        </button>

        {comment.replyCount > 0 && (
          <button
            onClick={handleLoadReplies}
            className="text-sm text-gray-600 hover:text-gray-700 font-medium transition-colors"
            disabled={repliesLoading}
          >
            {repliesLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Yükleniyor...
              </span>
            ) : (
              <>
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {showReplies ? 'Yanıtları Gizle' : `${comment.replyCount} Yanıtı Gör`}
              </>
            )}
          </button>
        )}
      </div>

      {/* Reply Form */}
  {showReplyForm && (
        <form onSubmit={handleReplySubmit} className="mb-4 space-y-3">
          <div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`${comment.user} kullanıcısına yanıt yazın...`}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              rows="3"
              maxLength="1000"
              disabled={submitting}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">
                {replyText.length}/1000 karakter
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReplyForm(false)
                    setReplyText('')
                    setValidationErrors({})
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700 transition-colors"
                  disabled={submitting}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={!replyText.trim() || submitting || !comment.approved}
                  className="px-4 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Gönderiliyor...' : 'Yanıtla'}
                </button>
              </div>
            </div>
          </div>
          
          <FormErrorDisplay errors={validationErrors} />
        </form>
      )}

      {/* Replies List */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3 mt-4">
          <div className="text-sm font-medium text-gray-700 mb-3">
            Yanıtlar ({comment.replies.length})
          </div>
          {comment.replies.map((reply) => (
            <div key={reply.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {reply.userAvatar ? (
                    <img src={reply.userAvatar} alt={reply.user} className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                      {reply.user.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-semibold text-gray-900 text-sm">{reply.user}</span>
                  {!reply.approved && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      Moderasyon Bekliyor
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {formatDate(reply.createdAt)}
                </span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">
                {reply.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* No Replies Message */}
      {showReplies && (!comment.replies || comment.replies.length === 0) && (
        <div className="text-center text-gray-500 text-sm py-4">
          Henüz yanıt bulunmuyor.
        </div>
      )}
    </div>
  )
}

export default CommentReplySystem
