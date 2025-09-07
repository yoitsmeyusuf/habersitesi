import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useContext, useRef, useCallback } from 'react'
import api from '../services/api'
import { UserContext } from '../contexts/UserContext'
import { useBreadcrumb } from '../contexts/BreadcrumbContext.jsx'
// import SocialShare from '../components/SocialShare'
import SEOHead from '../components/SEOHead'
import LazyImage from '../components/LazyImage'
import AuthorProfileCard from '../components/AuthorProfileCard'
import RelatedNews from '../components/RelatedNews'
import CommentReplySystem from '../components/CommentReplySystem'
import { validateInput } from '../utils/security'
import { NetworkErrorHandler, FormErrorDisplay, NotFoundPage, ConnectionStatus } from '../components/ErrorHandling'
import { PageLoadingProgress, FormSubmissionOverlay } from '../components/ProgressIndicators'
import { extractIdFromSlug, handleUrlMigration } from '../utils/slugUtils'
import logger from '../utils/logger'
import { TouchGestureHandler } from '../utils/mobileOptimization'
import { useToast } from '../components/Toast'
// Removed admin preview CSS to prevent extra borders/margins on public detail page

const NewsDetail = () => {
  const { id, slugWithId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Determine if we're using new slug format or old ID format
  const isSlugFormat = Boolean(slugWithId)
  const currentParam = slugWithId || id
  const newsId = isSlugFormat ? extractIdFromSlug(currentParam) : currentParam

  // States
  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [commentText, setCommentText] = useState('')
  // pendingComments removed; optimistic UI shows published comments immediately
  const [commentSubmissionState, setCommentSubmissionState] = useState('idle')
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false)
  
  const { user } = useContext(UserContext)
  const { showToast } = useToast()
  
  // Use emailVerified from user context instead of separate state
  const emailVerified = user?.emailVerified ?? true
  const { setBreadcrumb, clearBreadcrumb } = useBreadcrumb()
  const contentRef = useRef(null)

  // Handle reply submission
  const handleReplySubmit = useCallback(async (commentId, replyText) => {
    setIsCommentSubmitting(true)

    // Create optimistic reply
    const tempReplyId = `temp-r-${Date.now()}`
    const optimisticReply = {
      id: tempReplyId,
      text: replyText,
      user: user?.displayName || user?.username || user?.name || 'Siz',
      userAvatar: user?.profilePicture || user?.avatarUrl || null,
      createdAt: new Date().toISOString(),
      approved: true
    }

    // Optimistically insert reply into the thread
    setNews(prev => ({
      ...prev,
      comments: (prev.comments || []).map(c =>
        c.id === commentId
          ? {
              ...c,
              replies: [optimisticReply, ...(c.replies || [])],
              replyCount: (c.replyCount || 0) + 1
            }
          : c
      )
    }))

    try {
      const response = await api.addComment(newsId, {
        text: replyText,
        parentId: commentId
      })

      // Try to replace optimistic reply with server version if available
      const serverReply = response?.data?.comment || response?.comment || response?.data
      if (serverReply && serverReply.id) {
        setNews(prev => ({
          ...prev,
          comments: (prev.comments || []).map(c =>
            c.id === commentId
              ? {
                  ...c,
                  replies: (c.replies || []).map(r => (r.id === tempReplyId ? { ...serverReply } : r))
                }
              : c
          )
        }))
      }

      return response?.data || response
    } catch (error) {
      // Revert optimistic reply on error
      setNews(prev => ({
        ...prev,
        comments: (prev.comments || []).map(c =>
          c.id === commentId
            ? {
                ...c,
                replies: (c.replies || []).filter(r => r.id !== tempReplyId),
                replyCount: Math.max(0, (c.replyCount || 1) - 1)
              }
            : c
        )
      }))

      logger.error('Reply submission error:', error)
      throw new Error(error?.message || 'Yanıt gönderilirken hata oluştu')
    } finally {
      setIsCommentSubmitting(false)
    }
  }, [newsId, user])

  // Handle loading replies for a comment
  const handleLoadReplies = useCallback(async (commentId) => {
    try {
      const response = await api.getCommentReplies(commentId)
      const replies = response?.data || []

      // Update the comment with loaded replies
      setNews(prevNews => ({
        ...(prevNews || {}),
        comments: (prevNews?.comments || []).map(comment => 
          comment.id === commentId 
            ? { ...comment, replies }
            : comment
        )
      }))
      
      return replies
    } catch (error) {
      logger.error('Load replies error:', error)
      throw new Error('Yanıtlar yüklenirken hata oluştu')
    }
  }, [])

  // Touch gesture handler for mobile navigation
  useEffect(() => {
    const gestureHandler = new TouchGestureHandler(document.body, {
      threshold: 100,
      allowedTime: 300
    })
    
    gestureHandler.onSwipe = (direction, distance) => {
      if (Math.abs(distance) > 100) { // Only for significant swipes
        if (direction === 'left') {
          logger.log('👈 Swipe left detected - next article')
        } else if (direction === 'right') {
          logger.log('👉 Swipe right detected - previous article or back')
          navigate(-1) // Go back in history
        }
      }
    }
    
    return () => {
      // Cleanup if needed
    }
  }, [navigate])
  
  // Pending comments localStorage loader removed
  
  useEffect(() => {
    const loadNews = async () => {
      setLoading(true)
      setError(null)
      try {
        // Use appropriate API method based on URL format
        let newsData
        if (isSlugFormat) {
          // Try slug API first
          newsData = await api.getNewsBySlug(currentParam)
        } else {
          // Use traditional ID API
          newsData = await api.getNewsById(newsId)
        }
        
        if (newsData.success === false) {
          if (newsData.message.includes('bulunamadı') || newsData.message.includes('not found')) {
            setError('NOT_FOUND')
          } else {
            setError(newsData.message)
          }
        } else {
          setNews(newsData)
          
          // Handle URL migration for old format URLs
          if (!isSlugFormat && newsData && newsData.title) {
            handleUrlMigration(location.pathname, navigate, newsData)
          }
        }
      } catch (err) {
        logger.error('Error loading news:', err)
        setError('NETWORK_ERROR')
      } finally {
        setLoading(false)
      }
    }

    if (newsId) {
      loadNews()
    }
  }, [newsId, isSlugFormat, currentParam, location.pathname, navigate])

  // Set breadcrumb when news is loaded (separate effect to avoid circular dependencies)
  useEffect(() => {
    if (news) {
      setBreadcrumb([
        { label: 'Haberler', href: '/news' },
        { label: news.category, href: `/kategori/${news.category}` },
        { label: news.title }
      ])
    }
  }, [news, setBreadcrumb])

  useEffect(() => {
    // Clean up breadcrumb when component unmounts
    return () => {
      clearBreadcrumb()
    }
  }, [clearBreadcrumb])

  // Handle comment submission
  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return

    const submittedText = commentText.trim()
    const tempCommentId = `temp-${Date.now()}`
    const optimisticComment = {
      id: tempCommentId,
      text: submittedText,
      user: user?.displayName || user?.username || user?.name || 'Siz',
      userAvatar: user?.profilePicture || user?.avatarUrl || null,
      createdAt: new Date().toISOString(),
      approved: true,
      replies: [],
      replyCount: 0
    }

    // Optimistically add to visible comments list
    setNews(prev => ({
      ...prev,
      comments: [optimisticComment, ...(prev?.comments || [])]
    }))

    try {
      setCommentSubmissionState('submitting')
      
      // Clear form immediately for better UX
      setCommentText('')
      
      logger.log('💬 [COMMENT] Calling API addComment...')
      
      // Use submitted text as is - no quote system
      const finalCommentText = submittedText
      
      const response = await api.addComment(newsId, { text: finalCommentText })
      logger.log('💬 [COMMENT] API Response received:', response)
      
      if (response && response.success) {
        // If server returned the created comment with a real ID, replace the optimistic one
        const serverComment = response?.data?.comment || response?.comment || response?.data
        if (serverComment && serverComment.id) {
          setNews(prev => ({
            ...prev,
            comments: (prev?.comments || []).map(c => (c.id === tempCommentId ? { ...serverComment } : c))
          }))
        } else if (response?.id) {
          // Backend might return DTO directly at root
          setNews(prev => ({
            ...prev,
            comments: (prev?.comments || []).map(c => (c.id === tempCommentId ? { ...response } : c))
          }))
        }

        setCommentSubmissionState('success')
        setTimeout(() => setCommentSubmissionState('idle'), 2000)
      } else {
        // Revert optimistic addition
        setNews(prev => ({
          ...prev,
          comments: (prev?.comments || []).filter(c => c.id !== tempCommentId)
        }))
        setCommentSubmissionState('error')
        const errorMessage = response?.message || response?.error || 'Yorum gönderilirken bir hata oluştu'
        logger.error('Comment submission failed:', errorMessage)
        showToast(errorMessage, 'error')
        // Restore text for user to edit
        setCommentText(submittedText)
      }
    } catch (err) {
      // Revert optimistic addition on error
      setNews(prev => ({
        ...prev,
        comments: (prev?.comments || []).filter(c => c.id !== tempCommentId)
      }))
      setCommentSubmissionState('error')
      const errorMessage = err?.message || 'Yorum gönderilirken bir hata oluştu'
      logger.error('💬 [COMMENT] Submission error:', errorMessage)
      showToast(errorMessage, 'error')
      // Restore text for user to edit
      setCommentText(submittedText)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoadingProgress />
      </div>
    )
  }

  // Error states
  if (error === 'NOT_FOUND') {
    return <NotFoundPage />
  }

  if (error === 'NETWORK_ERROR') {
    return <NetworkErrorHandler onRetry={() => window.location.reload()} />
  }

  if (!news) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Haber bulunamadı</h2>
          <Link to="/" className="text-primary-600 hover:text-primary-700">
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 animate-fade-in news-detail-container page-transition">
        <ConnectionStatus />
        
        {/* SEO Head */}
        <SEOHead
          title={news.title}
          description={news.summary || news.content?.replace(/<[^>]*>/g, '').substring(0, 160)}
          keywords={news.tags || `${news.category}, haber, güncel`}
          author={news.author}
          image={news.image}
          url={`${window.location.origin}/news/${news.id}`}
          type="article"
          publishedTime={news.date}
          modifiedTime={news.updatedAt}
          tags={news.tags ? news.tags.split(',').map(tag => tag.trim()) : []}
          category={news.category}
        />

        {/* Main News Article */}
        <article className="card bg-white overflow-hidden mb-6 sm:mb-8 news-detail">
          {news.image && (
            <div className="relative">
              <LazyImage 
                src={news.image} 
                alt={news.title} 
                className="w-full h-48 sm:h-64 lg:h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
            </div>
          )}
          
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Category Badge */}
            <div className="mb-4 sm:mb-6">
              <span className="category-tag text-sm sm:text-base lg:text-lg">
                {news.category}
              </span>
            </div>
            
            {/* Article Title */}
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-4 sm:mb-6 text-gray-900 leading-tight">
              {news.title}
            </h1>
            
            {/* Article Meta */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 text-sm text-gray-600 gap-3 sm:gap-4">
              <div className="flex items-center gap-4 sm:gap-6">
                <span className="flex items-center gap-1 sm:gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  {new Date(news.date).toLocaleDateString('tr-TR')}
                </span>
                {news.authorDisplayName && (
                  <span className="flex items-center gap-1 sm:gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    {news.authorDisplayName}
                  </span>
                )}
                {news.viewCount && (
                  <span className="flex items-center gap-1 sm:gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    {news.viewCount.toLocaleString('tr-TR')} görüntüleme
                  </span>
                )}
              </div>
              
            
            </div>
            
            {/* Article Content */}
            <div 
              ref={contentRef}
              className="prose prose-sm sm:prose-base lg:prose-lg max-w-none mb-6 sm:mb-8 text-gray-700 leading-relaxed news-content" 
              dangerouslySetInnerHTML={{ __html: validateInput.htmlContent(news.content || '') }}
            ></div>

            {/* Tags */}
            {news.tags && (
              <div className="mb-6 sm:mb-8 flex flex-wrap gap-2 sm:gap-3">
                {news.tags.split(',').map(tag => (
                  <span 
                    key={tag.trim()} 
                    className="px-2 py-1 sm:px-3 sm:py-1 bg-gray-100 text-gray-700 rounded-full text-xs sm:text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    #{tag.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </article>
          {/* Social Share */}
              {/* SocialShare temporarily removed to reduce extra box/spacing */}

        {/* Simple comment section without quote system */}

        {/* Author Profile Card */}
        {news.author && (
          <AuthorProfileCard 
            authorName={news.author} 
            authorDisplayName={news.authorDisplayName}
            authorId={news.authorId}
            authorProfilePicture={news.authorProfilePicture}
          />
        )}

        {/* Comments Section */}
        <section className="card p-4 sm:p-6 lg:p-8 comment-section">
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-6 sm:mb-8 text-gray-900 flex items-center gap-2 sm:gap-3">
            <svg className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
            Yorumlar ({news.comments?.length || 0})
          </h3>

          {/* Comment Form */}
          {user ? (
            emailVerified ? (
              <form onSubmit={handleCommentSubmit} className="mb-6 sm:mb-8">
                <div className="mb-4 sm:mb-6">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Yorumunuzu yazın..."
                    className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm sm:text-base"
                    rows="4"
                    maxLength="1000"
                    disabled={commentSubmissionState === 'submitting'}
                  />
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs sm:text-sm text-gray-500">
                      <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Uygun yorumlar otomatik yayınlanır. Yasaklı kelime içerirse reddedilir.
                    </div>
                    
                    <button
                      type="submit"
                      disabled={!commentText.trim() || commentSubmissionState === 'submitting'}
                      className="px-4 py-2 sm:px-6 sm:py-3 bg-primary-600 text-white rounded-xl sm:rounded-2xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm sm:text-base flex items-center gap-2"
                    >
                      {commentSubmissionState === 'submitting' ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Gönderiliyor...
                        </>
                      ) : (
                        'Yorum Yap'
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Comment Submission Status Messages */}
        {commentSubmissionState === 'success' && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
          Yorumunuz yayınlandı.
                  </div>
                )}
                
                {commentSubmissionState === 'error' && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Yorum gönderilirken bir hata oluştu. Lütfen tekrar deneyin.
                  </div>
                )}
              </form>
            ) : (
              <div className="mb-4 sm:mb-6 p-4 bg-gradient-to-r from-accent-50 to-accent-100 border border-accent-200 rounded-xl sm:rounded-2xl">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-accent-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold text-accent-800 text-sm sm:text-base">E-posta doğrulaması gerekli</span>
                </div>
                <p className="text-accent-700 mb-3 text-xs sm:text-sm">Yorum yapabilmek için e-posta adresinizi doğrulamalısınız.</p>
                <button
                  className="px-3 py-2 sm:px-4 sm:py-2 bg-accent-500 text-white rounded-lg sm:rounded-xl hover:bg-accent-600 transition-all duration-200 font-medium text-xs sm:text-sm"
                  onClick={async () => {
                    try {
                      const res = await api.resendConfirmation(user.email)
                      showToast(res.message || 'Doğrulama e-postası gönderildi', 'success')
                    } catch {
                      showToast('E-posta gönderme hatası', 'error')
                    }
                  }}
                >
                  Doğrulama e-postası gönder
                </button>
              </div>
            )
          ) : (
            <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-xl sm:rounded-2xl">
              <h4 className="font-semibold text-primary-800 mb-2 text-sm sm:text-base">Yorum yapmak için giriş yapın</h4>
              <p className="text-primary-700 mb-4 text-xs sm:text-sm">Yorumlarınızı paylaşabilmek için önce giriş yapmanız gerekiyor.</p>
              <div className="flex gap-2 sm:gap-3">
                <Link 
                  to="/giris" 
                  className="px-3 py-2 sm:px-4 sm:py-2 bg-primary-500 text-white rounded-lg sm:rounded-xl hover:bg-primary-600 transition-all duration-200 font-medium text-xs sm:text-sm"
                >
                  Giriş Yap
                </Link>
                <Link 
                  to="/kayit" 
                  className="px-3 py-2 sm:px-4 sm:py-2 border border-primary-500 text-primary-600 rounded-lg sm:rounded-xl hover:bg-primary-50 transition-all duration-200 font-medium text-xs sm:text-sm"
                >
                  Kayıt Ol
                </Link>
              </div>
            </div>
          )}

          {/* Pending comments UI removed: clean yorumlar otomatik yayınlanıyor; hatada toast gösteriyoruz */}

          {/* Comments List */}
          <div className="comments-section">
            {news.comments && news.comments.length > 0 ? (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Yorumlar ({news.comments.length})
                </h3>
                {news.comments.map((comment) => (
                  <div key={comment.id} className="comment-item border-b border-gray-200 pb-4">
                    <div className="flex items-start space-x-3">
                      {comment.userAvatar ? (
                        <img src={comment.userAvatar} alt={comment.user}
                             className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {comment.user ? comment.user.charAt(0).toUpperCase() : 'A'}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-gray-900">{comment.user || 'Anonim'}</span>
                          <span className="text-gray-500 text-xs">
                            {new Date(comment.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                          {!comment.approved && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              Moderasyon Bekliyor
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 mb-2">{comment.text}</p>
                        
                        {/* Reply System for each comment */}
                        <CommentReplySystem 
                          comment={comment}
                          user={user}
                          onReplySubmit={handleReplySubmit}
                          onLoadReplies={handleLoadReplies}
                          emailVerified={emailVerified}
                          submitting={isCommentSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Henüz yorum yapılmamış. İlk yorumu siz yapın!</p>
              </div>
            )}
          </div>
        </section>

        {/* Related News */}
        <RelatedNews 
          currentNewsId={newsId}
          category={news.category}
          tags={news.tags}
        />

        {/* Email Verification Warning */}
        {!emailVerified && user && (
          <div className="mb-4 sm:mb-6 p-4 bg-gradient-to-r from-accent-50 to-accent-100 border border-accent-200 rounded-xl sm:rounded-2xl">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-accent-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold text-accent-800 text-sm sm:text-base">E-posta doğrulaması gerekli</span>
            </div>
            <p className="text-accent-700 mb-3 text-xs sm:text-sm">Yorum yapabilmek için e-posta adresinizi doğrulamalısınız.</p>
            <button
              className="px-3 py-2 sm:px-4 sm:py-2 bg-accent-500 text-white rounded-lg sm:rounded-xl hover:bg-accent-600 transition-all duration-200 font-medium text-xs sm:text-sm"
              onClick={async () => {
                try {
                  const res = await api.resendConfirmation(user.email)
                  showToast(res.message || 'Doğrulama e-postası gönderildi', 'success')
                } catch {
                  showToast('E-posta gönderme hatası', 'error')
                }
              }}
            >
              Doğrulama e-postası gönder
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default NewsDetail
