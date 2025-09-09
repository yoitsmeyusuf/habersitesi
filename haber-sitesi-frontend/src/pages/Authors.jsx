import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useBreadcrumb } from '../contexts/BreadcrumbContext.jsx'

const Authors = () => {
  const [authors, setAuthors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { setBreadcrumb, clearBreadcrumb } = useBreadcrumb()

  useEffect(() => {
    // Set explicit breadcrumb and clear on unmount to avoid leaking to other pages
    setBreadcrumb([
      { label: 'Haberler', href: '/news' },
      { label: 'Yazarlar' }
    ])
    return () => clearBreadcrumb()
  }, [setBreadcrumb, clearBreadcrumb])

  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        setLoading(true)
        
        // Try to get authors from new API endpoint
        try {
          const response = await api.get('/kimlik/yazarlar')
          const list = Array.isArray(response) ? response : (response.data || response.items || [])
          setAuthors(list)
        } catch (apiError) {
          // If API fails, use mock data for demonstration
          const mockAuthors = [
            {
              id: 1,
              username: 'mehmet-yazar',
              displayName: 'Mehmet Özkan',
              bio: 'Deneyimli gazeteci. 15 yıldır haber sektöründe aktif olarak çalışmaktadır.',
              profilePicture: null,
              newsCount: 42
            },
            {
              id: 2,
              username: 'ayse-editor',
              displayName: 'Ayşe Demir',
              bio: 'Siyaset editörü ve köşe yazarı. Ankara\'dan güncel gelişmeleri takip eder.',
              profilePicture: null,
              newsCount: 38
            },
            {
              id: 3,
              username: 'ali-spor',
              displayName: 'Ali Kaya',
              bio: 'Spor muhabiri. Futboldan basketbola tüm spor dallarında uzman.',
              profilePicture: null,
              newsCount: 29
            },
            {
              id: 4,
              username: 'fatma-ekonomi',
              displayName: 'Fatma Şahin',
              bio: 'Ekonomi editörü. Borsa ve finans konularında 10 yıllık tecrübe.',
              profilePicture: null,
              newsCount: 51
            }
          ]
          setAuthors(mockAuthors)
        }
        
        setError(null)
      } catch (error) {
        console.error('Yazarlar getirilemedi:', error)
        setError('Yazarlar yüklenirken bir hata oluştu.')
      } finally {
        setLoading(false)
      }
    }

    fetchAuthors()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-gray-600">Yazarlar yükleniyor...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Hata Oluştu</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn btn-primary"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-4">
              Yazarlarımız
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Deneyimli gazeteci ve editörlerden oluşan kadromuzla güncel haberleri ve derinlemesine analizleri sizlere sunuyoruz.
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-red-500 to-orange-500 mx-auto mt-6 rounded-full"></div>
          </div>

          {authors.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Henüz Yazar Yok</h3>
              <p className="text-gray-600">Yakında yazarlarımız burada yer alacak.</p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
                <div className="text-center">
                  <span className="text-3xl font-bold text-red-600">{authors.length}</span>
                  <span className="text-gray-600 ml-2">Yazarımız</span>
                  <p className="text-sm text-gray-500 mt-1">Size en güncel haberleri getiriyor</p>
                </div>
              </div>

              {/* Authors Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {authors.map((author) => (
                  <Link
                    key={author.id}
                    to={`/yazar/${author.username}`}
                    className="group block"
                  >
                    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group-hover:border-red-200 group-hover:-translate-y-1">
                      {/* Profile Image */}
                      <div className="relative overflow-hidden">
                        <div className="aspect-square bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                          {author.profilePicture ? (
                            <img
                              src={author.profilePicture}
                              alt={author.displayName || author.username}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                              <span className="text-2xl font-bold text-white">
                                {(author.displayName || author.username).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
                      </div>

                      {/* Author Info */}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 text-lg mb-1 group-hover:text-red-600 transition-colors duration-200">
                          {author.displayName || author.username}
                        </h3>
                        <p className="text-gray-600 text-sm mb-2">@{author.username}</p>
                        
                        {author.bio && (
                          <p className="text-gray-500 text-sm line-clamp-2 mb-3">
                            {author.bio}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>{author.newsCount || 0} yazı</span>
                          </div>
                          <div className="flex items-center text-red-500">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span>Profili Gör</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default Authors
