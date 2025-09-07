import { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { UserContext } from '../contexts/UserContext'
import logger from '../utils/logger'

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const userContext = useContext(UserContext)
  const { user, isAuthenticated, updateUser } = userContext || {}
  logger.log('ProtectedRoute - UserContext:', userContext)
  logger.log('ProtectedRoute - isAuthenticated type:', typeof isAuthenticated)
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // Give some time for the app to initialize
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Check if user is authenticated
        if (!isAuthenticated) {
          logger.log('ProtectedRoute: User not authenticated, redirecting to login')
          navigate('/giris')
          return
        }

        // Check if user has required role
        if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
          logger.log('ProtectedRoute: User lacks required role:', requiredRole)
          alert('Bu sayfaya erişim yetkiniz yok.')
          navigate('/')
          return
        }

        // Update user state if needed
        if (!user) {
          const userFromToken = api.getUserFromToken()
          if (userFromToken) {
            updateUser(userFromToken)
            logger.log('ProtectedRoute: User state updated from token')
          }
        }
      } catch (error) {
        logger.error('ProtectedRoute: Authentication check failed:', error)
        navigate('/giris')
      } finally {
        setIsChecking(false)
      }
    }

    checkAuthentication()
  }, [user, isAuthenticated, navigate, requiredRole, updateUser])

  if (isChecking) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Yetkilendirme kontrol ediliyor...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <div className="max-w-md mx-auto mt-12 text-center text-lg">Yönlendiriliyorsunuz...</div>
  }

  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <div className="max-w-md mx-auto mt-12 text-center text-lg">Erişim reddedildi.</div>
  }

  return children
}

export default ProtectedRoute
