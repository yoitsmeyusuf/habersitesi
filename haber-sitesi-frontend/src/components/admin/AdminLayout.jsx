import NewsManager from './NewsManager'
import CategoryManager from './CategoryManager'
import CommentManager from './CommentManager'
import UserManager from './UserManager'
import SettingsManager from './SettingsManager'
import FeaturedNewsManager from './FeaturedNewsManager'
import { useAdmin } from '../../hooks/useAdmin'

const AdminLayout = ({ user }) => {
  const { state, actions } = useAdmin()
  const { activeTab } = state

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', adminOnly: true },
    { id: 'news', label: user?.role === 'author' ? 'Haberlerim' : 'Haberler', icon: '📰', adminOnly: false },
    { id: 'featured', label: 'Featured Haberler', icon: '⭐', adminOnly: true },
    { id: 'categories', label: 'Kategoriler', icon: '📂', adminOnly: true },
    { id: 'comments', label: user?.role === 'author' ? 'Yorumlarım' : 'Yorumlar', icon: '💬', adminOnly: false },
    { id: 'users', label: 'Kullanıcılar', icon: '👥', adminOnly: true },
    { id: 'settings', label: 'Ayarlar', icon: '⚙️', adminOnly: true },
  ]

  const availableTabs = tabs.filter(tab => 
    !tab.adminOnly || user?.role === 'admin'
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <h2 className="text-3xl font-bold mb-2">👋 Hoş Geldiniz!</h2>
              <p className="text-blue-100">
                Merhaba <strong>{user?.username}</strong>! Admin paneline hoş geldiniz.
              </p>
              <div className="flex items-center mt-4 space-x-4">
                <span className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Sistem Aktif
                </span>
                <span className="text-sm text-blue-200">
                  Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
                </span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Toplam Haberler</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">
                      {state.stats?.newsStats?.total || state.allNews?.length || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-full">
                    <span className="text-2xl">📰</span>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  <span className="text-green-600 font-medium">
                    ✅ {state.stats?.newsStats?.approved || 0} onaylı
                  </span>
                  <span className="text-yellow-600 font-medium ml-2">
                    ⏳ {state.stats?.newsStats?.pending || 0} beklemede
                  </span>
                  <div className="mt-1">
                    <span className="text-blue-600 text-xs">
                      📊 Onay oranı: %{state.stats?.newsStats?.approvalRate || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Aktif Kullanıcılar</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">
                      {state.stats?.userStats?.total || state.users?.length || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-full">
                    <span className="text-2xl">👥</span>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  <span className="text-green-600 font-medium">
                    ✅ {state.stats?.userStats?.approved || 0} onaylı
                  </span>
                  <span className="text-yellow-600 font-medium ml-2">
                    ⏳ {state.stats?.userStats?.pendingApproval || 0} beklemede
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Bekleyen Yorumlar</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-1">
                      {state.stats?.commentStats?.pending || state.comments?.filter(c => !c.approved)?.length || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-full">
                    <span className="text-2xl">💬</span>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  <span className="text-green-600 font-medium">
                    ✅ {state.stats?.commentStats?.approved || 0} onaylı
                  </span>
                  <span className="text-blue-600 text-xs ml-2">
                    📊 Onay oranı: %{state.stats?.commentStats?.approvalRate || 0}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Kategoriler</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">
                      {state.stats?.systemInfo?.totalCategories || state.categories?.length || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-full">
                    <span className="text-2xl">📂</span>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  <span className="text-purple-600 font-medium">
                    📊 {state.stats?.newsStats?.categoriesInUse || 0} kategori kullanımda
                  </span>
                </div>
              </div>
            </div>

            {/* New Pending News Section */}
            {state.stats?.recentActivity?.pendingNews?.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  ⏳ Onay Bekleyen Haberler
                  <span className="ml-2 bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {state.stats?.recentActivity?.pendingNews?.length}
                  </span>
                </h3>
                <div className="space-y-3">
                  {state.stats?.recentActivity?.pendingNews?.slice(0, 5)?.map((news, index) => (
                    <div key={news.id || index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center flex-1">
                        <span className="text-lg mr-3">📰</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">
                            {news.title?.substring(0, 60)}...
                          </p>
                          <p className="text-xs text-gray-600">
                            👤 {news.author} • 📂 {news.category} • 📅 {new Date(news.date).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                          ⏰ {news.daysWaiting || 0} gün
                        </span>
                        <button
                          onClick={() => actions.setActiveTab('news')}
                          className="bg-blue-500 text-white text-xs px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                        >
                          İncele
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <button
                    onClick={() => actions.setActiveTab('news')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Tüm bekleyen haberleri görüntüle →
                  </button>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Hızlı İşlemler</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => actions.setActiveTab('news')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">📝</span>
                    <div>
                      <h4 className="font-medium text-gray-900">Yeni Haber Ekle</h4>
                      <p className="text-sm text-gray-500">Hızlı haber ekleme</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => actions.setActiveTab('comments')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-yellow-50 hover:border-yellow-300 transition-colors text-left"
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">✅</span>
                    <div>
                      <h4 className="font-medium text-gray-900">Yorumları Onayla</h4>
                      <p className="text-sm text-gray-500">Bekleyen yorumları yönet</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => actions.setActiveTab('categories')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors text-left"
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">📂</span>
                    <div>
                      <h4 className="font-medium text-gray-900">Kategori Yönet</h4>
                      <p className="text-sm text-gray-500">Kategorileri düzenle</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Email & System Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-indigo-500">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  📧 Email İstatistikleri
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Toplam gönderilen:</span>
                    <span className="font-semibold text-indigo-600">
                      {state.stats?.emailStats?.total || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Başarılı:</span>
                    <span className="font-semibold text-green-600">
                      {state.stats?.emailStats?.successful || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Başarısız:</span>
                    <span className="font-semibold text-red-600">
                      {state.stats?.emailStats?.failed || 0}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Başarı oranı:</span>
                      <span className="font-bold text-indigo-600">
                        %{state.stats?.emailStats?.successRate || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-cyan-500">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  👤 Kullanıcı Dağılımı
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">👑 Admin:</span>
                    <span className="font-semibold text-purple-600">
                      {state.stats?.userStats?.roleDistribution?.admin || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">✍️ Yazar:</span>
                    <span className="font-semibold text-blue-600">
                      {state.stats?.userStats?.roleDistribution?.author || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">👤 Kullanıcı:</span>
                    <span className="font-semibold text-green-600">
                      {state.stats?.userStats?.roleDistribution?.user || 0}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">📧 Email onaylı:</span>
                      <span className="font-bold text-cyan-600">
                        {state.stats?.userStats?.emailConfirmed || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Trends Chart */}
            {state.stats?.monthlyTrends?.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  📈 Aylık Trend Verileri
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ay
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kullanıcı
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Onaylı Haber
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bekleyen Haber
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Yorum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {state.stats.monthlyTrends.slice(0, 6).map((trend, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {new Date(trend.month).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                            {trend.users || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                            {trend.approvedNews || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-semibold">
                            {trend.pendingNews || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-semibold">
                            {trend.comments || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-semibold">
                            {trend.emails || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Son Aktiviteler</h3>
              <div className="space-y-3">
                {state.allNews?.slice(0, 5)?.map((news, index) => (
                  <div key={news.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-sm mr-3">📰</span>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {news.title?.substring(0, 50)}...
                        </p>
                        <p className="text-xs text-gray-500">
                          {news.author} • {new Date(news.createdAt).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      news.approved === true ? 'bg-green-100 text-green-800' :
                      news.approved === false ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {news.approved === true ? '✅ Onaylı' :
                       news.approved === false ? '❌ Reddedildi' :
                       '⏳ Bekliyor'}
                    </span>
                  </div>
                )) || (
                  <p className="text-gray-500 text-center py-4">Henüz aktivite yok</p>
                )}
              </div>
            </div>
          </div>
        )
      case 'news':
        return <NewsManager user={user} />
      case 'featured':
        return <FeaturedNewsManager />
      case 'categories':
        return <CategoryManager />
      case 'comments':
        return <CommentManager user={user} />
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
