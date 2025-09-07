import { useState, useEffect } from 'react'
import api from '../services/api'

const SocialShare = ({ newsId,/* title ,*/ className = '' }) => {
  const [shareCount, setShareCount] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadShareCount = async () => {
      try {
        const result = await api.getShareCount(newsId)
        if (result.shareCounts) {
          setShareCount(result.shareCounts)
        }
      } catch (error) {
        console.error('Share count yüklenemedi:', error)
      }
    }

    if (newsId) {
      loadShareCount()
    }
  }, [newsId])

  const handleShare = async (platform) => {
    setLoading(true)
    try {
      const result = await api.shareNews(newsId, platform)
      if (result.shareUrl) {
        // Open share URL in new window
        const width = 600
        const height = 400
        const left = (window.innerWidth - width) / 2
        const top = (window.innerHeight - height) / 2
        
        window.open(
          result.shareUrl,
          'share',
          `width=${width},height=${height},left=${left},top=${top},toolbar=0,menubar=0,scrollbars=1,resizable=1`
        )

        // Refresh share count after a delay
        setTimeout(async () => {
          const updatedResult = await api.getShareCount(newsId)
          if (updatedResult.shareCounts) {
            setShareCount(updatedResult.shareCounts)
          }
        }, 1000)
      }
    } catch (error) {
      console.error('Paylaşım hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  const platforms = [
    {
      name: 'facebook',
      label: 'Facebook',
      icon: '📘',
      color: 'bg-blue-600 hover:bg-blue-700',
      textColor: 'text-blue-600'
    },
    {
      name: 'twitter',
      label: 'Twitter',
      icon: '🐦',
      color: 'bg-sky-500 hover:bg-sky-600',
      textColor: 'text-sky-500'
    },
    {
      name: 'whatsapp',
      label: 'WhatsApp',
      icon: '💬',
      color: 'bg-green-600 hover:bg-green-700',
      textColor: 'text-green-600'
    },
    {
      name: 'linkedin',
      label: 'LinkedIn',
      icon: '💼',
      color: 'bg-blue-800 hover:bg-blue-900',
      textColor: 'text-blue-800'
    },
    {
      name: 'telegram',
      label: 'Telegram',
      icon: '✈️',
      color: 'bg-blue-500 hover:bg-blue-600',
      textColor: 'text-blue-500'
    }
  ]

  return (
    <div className={`bg-white rounded-2xl p-6 shadow-lg border border-gray-100 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Haberi Paylaş</h3>
        {shareCount && (
          <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            <span className="font-semibold">{shareCount.total}</span> paylaşım
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {platforms.map(platform => (
          <button
            key={platform.name}
            onClick={() => handleShare(platform.name)}
            disabled={loading}
            className={`
              ${platform.color} text-white rounded-xl p-3 transition-all duration-200 
              flex flex-col items-center justify-center space-y-1 min-h-[80px]
              hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <span className="text-xl">{platform.icon}</span>
            <span className="text-xs font-medium">{platform.label}</span>
          </button>
        ))}
      </div>

      {shareCount && (
        <div className="border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-600 mb-2 font-medium">Platform Paylaşımları:</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {platforms.map(platform => {
              const count = shareCount[platform.name] || 0
              return (
                <div key={platform.name} className="text-center">
                  <div className={`text-xs ${platform.textColor} font-bold`}>
                    {count}
                  </div>
                  <div className="text-xs text-gray-500">{platform.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center text-sm text-gray-500 mt-2">
          Paylaşım açılıyor...
        </div>
      )}
    </div>
  )
}

export default SocialShare
