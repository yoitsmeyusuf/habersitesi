import NewsManager from './NewsManager'
import CategoryManager from './CategoryManager'
import CommentManager from './CommentManager'
import UserManager from './UserManager'
import SettingsManager from './SettingsManager'
import { useAdmin } from '../../hooks/useAdmin'

const AdminLayout = ({ user }) => {
  const { state, actions } = useAdmin()
  const { activeTab } = state

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', adminOnly: false },
    { id: 'news', label: 'Haberler', icon: '📰', adminOnly: false },
    { id: 'categories', label: 'Kategoriler', icon: '📂', adminOnly: true },
    { id: 'comments', label: 'Yorumlar', icon: '💬', adminOnly: true },
    { id: 'users', label: 'Kullanıcılar', icon: '👥', adminOnly: true },
    { id: 'settings', label: 'Ayarlar', icon: '⚙️', adminOnly: false },
  ]

  const availableTabs = tabs.filter(tab => 
    !tab.adminOnly || user?.role === 'admin'
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900">Toplam Haberler</h3>
                <p className="text-2xl font-bold text-blue-600">{state.stats?.totalNews || 0}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900">Aktif Kullanıcılar</h3>
                <p className="text-2xl font-bold text-green-600">{state.stats?.activeUsers || 0}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-900">Bekleyen Yorumlar</h3>
                <p className="text-2xl font-bold text-yellow-600">{state.stats?.pendingComments || 0}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-900">Kategoriler</h3>
                <p className="text-2xl font-bold text-purple-600">{state.stats?.totalCategories || 0}</p>
              </div>
            </div>
          </div>
        )
      case 'news':
        return <NewsManager user={user} />
      case 'categories':
        return <CategoryManager />
      case 'comments':
        return <CommentManager />
      case 'users':
        return <UserManager />
      case 'settings':
        return <SettingsManager />
      default:
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Hoş Geldiniz</h2>
            <p className="text-gray-600">Lütfen yukarıdaki menüden bir seçim yapın.</p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Hoş geldiniz, {user?.username}</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                {user?.role === 'admin' ? 'Admin' : 'Kullanıcı'}
              </span>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <nav className="flex space-x-8">
            {availableTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => actions.setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>
    </div>
  )
}

export default AdminLayout
