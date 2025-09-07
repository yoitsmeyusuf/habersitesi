import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { getDisplayName, getUserInitials } from '../utils/userUtils'

const AuthorProfileCard = ({ authorName, authorDisplayName, authorId, authorProfilePicture, author: directAuthor }) => {
  const [author, setAuthor] = useState(directAuthor || null)
  const [loading, setLoading] = useState(!directAuthor)

  useEffect(() => {
    // If we already have author data directly, don't fetch again
    if (directAuthor) {
      setAuthor(directAuthor)
      setLoading(false)
      return
    }

    const loadAuthorProfile = async () => {
      setLoading(true)
      try {
        const result = await api.getAuthorProfile(authorName)
        if (result.success !== false) {
          setAuthor(result)
        }
      } catch (err) {
        console.error('Author profile loading error:', err)
      } finally {
        setLoading(false)
      }
    }

    if (authorName) {
      loadAuthorProfile()
    }
  }, [authorName, directAuthor])

  if (loading) {
    return (
      <div className="card mb-8 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!author) {
    return null
  }

  // Get display name - prioritize authorDisplayName prop, then author API response, finally username
  const displayName = authorDisplayName || getDisplayName({
    displayName: author?.displayName,
    firstName: author?.firstName,
    lastName: author?.lastName,
    username: author?.username || authorName
  })
  
  // Get profile picture - prioritize prop, then author object
  const profilePicture = authorProfilePicture || author?.profilePicture
  
  // Use actual username as URL parameter - no slug conversion needed
  const authorUrlParam = author?.username || authorName || authorId || 'unknown'

  return (
    <div className="card mb-8 overflow-hidden">
      <div className="bg-gradient-to-r from-primary-50 to-accent-50 p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          Yazar Hakkında
        </h3>
        
        <div className="flex items-start gap-4">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            {profilePicture ? (
              <img
                src={profilePicture}
                alt={`${displayName} profil resmi`}
                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white text-xl font-bold border-2 border-white shadow-lg">
                {getUserInitials({
                  displayName: author?.displayName,
                  firstName: author?.firstName,
                  lastName: author?.lastName,
                  username: author?.username || authorName
                })}
              </div>
            )}
          </div>
          
          {/* Author Info */}
          <div className="flex-1 min-w-0">            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-xl font-bold text-gray-900">{displayName}</h4>
              <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                {author.role === 'admin' ? 'Yönetici' : 'Yazar'}
              </span>
            </div>
            
            {author.bio && (
              <p className="text-gray-700 leading-relaxed mb-4 line-clamp-3">
                {author.bio}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {author.createdAt && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span>{new Date(author.createdAt).toLocaleDateString('tr-TR')} tarihinden beri üye</span>
                </div>
              )}
            </div>
              <div className="mt-4">
              <Link
                to={`/yazar/${authorUrlParam}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl hover:from-primary-600 hover:to-accent-600 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Tüm Yazılarını Gör
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthorProfileCard
