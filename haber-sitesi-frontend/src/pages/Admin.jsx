import { useContext } from 'react'
import { UserContext } from '../contexts/UserContext'
import { AdminProvider } from '../contexts/AdminContext'
import AdminLayout from '../components/admin/AdminLayout'
import ErrorBoundary from '../components/ErrorBoundary'

// Main Admin Component
const Admin = () => {
  const { user } = useContext(UserContext)

  // Access control
  if (!user || (user.role !== 'admin' && user.role !== 'author')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Erişim Reddedildi</h2>
          <p className="text-gray-600 mb-4">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
          <a
            href="/giris"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors inline-block"
          >
            Giriş Yap
          </a>
        </div>
      </div>
    )
  }

  return (
    <AdminProvider user={user}>
      <ErrorBoundary>
        <AdminLayout user={user} />
      </ErrorBoundary>
    </AdminProvider>
  )
}

export default Admin