import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import ConfirmationModal from '../ConfirmationModal'
import Toast from '../Toast'

const UserManager = () => {
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('all') // all, admin, author, user, banned
  const [searchTerm, setSearchTerm] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmAction, setConfirmAction] = useState({ type: '', id: null })
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    is_active: true
  })

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        limit: 20,
        role: filter === 'all' ? '' : filter,
        search: searchTerm
      }
      
      const response = await api.getUsers(params)
      setUsers(response.users || response.data?.users || [])
      setTotalPages(response.totalPages || response.data?.totalPages || 1)
    } catch {
      showToast('Kullanıcılar yüklenirken hata oluştu', 'error')
    } finally {
      setLoading(false)
    }
  }, [currentPage, filter, searchTerm])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const handleAction = (type, id, userData = null) => {
    if (type === 'edit') {
      setEditingUser(userData)
      setUserFormData({
        username: userData.username,
        email: userData.email,
        password: '',
        role: userData.role,
        is_active: userData.is_active
      })
      setShowUserForm(true)
    } else {
      setConfirmAction({ type, id })
      setShowConfirm(true)
    }
  }

  const confirmUserAction = async () => {
    const { type, id } = confirmAction
    
    try {
      switch (type) {
        case 'activate':
          await api.activateUser(id)
          showToast('Kullanıcı aktifleştirildi')
          break
        case 'deactivate':
          await api.deactivateUser(id)
          showToast('Kullanıcı pasifleştirildi')
          break
        case 'ban':
          await api.banUser(id)
          showToast('Kullanıcı yasaklandı')
          break
        case 'unban':
          await api.unbanUser(id)
          showToast('Kullanıcı yasağı kaldırıldı')
          break
        case 'delete':
          await api.deleteUser(id)
          showToast('Kullanıcı silindi')
          break
        case 'makeAdmin':
          await api.updateUserRole(id, 'admin')
          showToast('Kullanıcı admin yapıldı')
          break
        case 'makeAuthor':
          await api.updateUserRole(id, 'author')
          showToast('Kullanıcı yazar yapıldı')
          break
        case 'removeAdmin':
          await api.updateUserRole(id, 'user')
          showToast('Admin yetkisi kaldırıldı')
          break
        case 'removeAuthor':
          await api.updateUserRole(id, 'user')
          showToast('Yazar yetkisi kaldırıldı')
          break
        default:
          break
      }
      
      fetchUsers()
    } catch (error) {
      showToast(error.message || 'İşlem sırasında hata oluştu', 'error')
    }
    
    setShowConfirm(false)
    setConfirmAction({ type: '', id: null })
  }

  const handleUserFormSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const userData = { ...userFormData }
      if (!userData.password) {
        delete userData.password // Don't update password if empty
      }
      
      if (editingUser) {
        await api.updateUser(editingUser.id, userData)
        showToast('Kullanıcı güncellendi')
      } else {
        await api.createUser(userData)
        showToast('Kullanıcı eklendi')
      }
      
      setShowUserForm(false)
      setEditingUser(null)
      setUserFormData({
        username: '',
        email: '',
        password: '',
        role: 'user',
        is_active: true
      })
      fetchUsers()
    } catch (error) {
      showToast(error.response?.data?.message || 'İşlem sırasında hata oluştu', 'error')
    }
  }

  const getRoleBadge = (role) => {
    const roleClasses = {
      admin: 'bg-purple-100 text-purple-800',
      author: 'bg-green-100 text-green-800',
      user: 'bg-blue-100 text-blue-800'
    }
    
    const roleTexts = {
      admin: 'Admin',
      author: 'Yazar',
      user: 'Kullanıcı'
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleClasses[role] || 'bg-gray-100 text-gray-800'}`}>
        {roleTexts[role] || role}
      </span>
    )
  }

  const getStatusBadge = (isActive, isBanned) => {
    if (isBanned) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Yasaklı</span>
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {isActive ? 'Aktif' : 'Pasif'}
      </span>
    )
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">👥 Kullanıcı Yönetimi</h2>
            <p className="text-purple-100">
              Sistemdeki kullanıcıları yönetin ve izinlerini düzenleyin
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{users.length}</div>
            <div className="text-sm text-purple-200">Toplam Kullanıcı</div>
          </div>
        </div>
      </div>

      {/* Filters and Add Button */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="flex-1">
              <input
                type="text"
                placeholder="👤 Kullanıcı ara..."
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
                <option value="all">👥 Tüm Kullanıcılar</option>
                <option value="admin">👑 Adminler</option>
                <option value="author">✍️ Yazarlar</option>
                <option value="user">👤 Kullanıcılar</option>
                <option value="banned">🚫 Yasaklı</option>
              </select>
            </div>
          </div>
          
          <button
            onClick={() => {
              setEditingUser(null)
              setUserFormData({
                username: '',
                email: '',
                password: '',
                role: 'user',
                is_active: true
              })
              setShowUserForm(true)
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            ➕ Yeni Kullanıcı
          </button>
        </div>
      </div>

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
            </h3>
            
            <form onSubmit={handleUserFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kullanıcı Adı
                </label>
                <input
                  type="text"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta
                </label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şifre {editingUser && '(Boş bırakın değiştirmek istemiyorsanız)'}
                </label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol
                </label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">Kullanıcı</option>
                  <option value="author">Yazar</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={userFormData.is_active}
                  onChange={(e) => setUserFormData({ ...userFormData, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Aktif kullanıcı
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                >
                  {editingUser ? 'Güncelle' : 'Ekle'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserForm(false)
                    setEditingUser(null)
                  }}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-md hover:bg-gray-600"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Kullanıcılar</h3>
        
        {loading ? (
          <div className="text-center py-8">Yükleniyor...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Kullanıcı bulunamadı</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    E-posta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kayıt Tarihi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.username}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(user.approved, user.is_banned || false)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleAction('edit', user.id, user)}
                          className="text-blue-600 hover:text-blue-900 text-xs"
                        >
                          Düzenle
                        </button>
                        
                        {user.is_active ? (
                          <button
                            onClick={() => handleAction('deactivate', user.id)}
                            className="text-yellow-600 hover:text-yellow-900 text-xs"
                          >
                            Pasifleştir
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction('activate', user.id)}
                            className="text-green-600 hover:text-green-900 text-xs"
                          >
                            Aktifleştir
                          </button>
                        )}
                        
                        {user.is_banned ? (
                          <button
                            onClick={() => handleAction('unban', user.id)}
                            className="text-green-600 hover:text-green-900 text-xs"
                          >
                            Yasağı Kaldır
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction('ban', user.id)}
                            className="text-orange-600 hover:text-orange-900 text-xs"
                          >
                            Yasakla
                          </button>
                        )}
                        
                        {user.role === 'admin' ? (
                          <button
                            onClick={() => handleAction('removeAdmin', user.id)}
                            className="text-purple-600 hover:text-purple-900 text-xs"
                          >
                            Admin Kaldır
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction('makeAdmin', user.id)}
                            className="text-purple-600 hover:text-purple-900 text-xs"
                          >
                            Admin Yap
                          </button>
                        )}
                        
                        {user.role === 'author' ? (
                          <button
                            onClick={() => handleAction('removeAuthor', user.id)}
                            className="text-green-600 hover:text-green-900 text-xs"
                          >
                            Yazar Kaldır
                          </button>
                        ) : user.role === 'user' ? (
                          <button
                            onClick={() => handleAction('makeAuthor', user.id)}
                            className="text-green-600 hover:text-green-900 text-xs"
                          >
                            Yazar Yap
                          </button>
                        ) : null}
                        
                        <button
                          onClick={() => handleAction('delete', user.id)}
                          className="text-red-600 hover:text-red-900 text-xs"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        onConfirm={confirmUserAction}
        title={
          confirmAction.type === 'activate' ? 'Kullanıcıyı Aktifleştir' :
          confirmAction.type === 'deactivate' ? 'Kullanıcıyı Pasifleştir' :
          confirmAction.type === 'ban' ? 'Kullanıcıyı Yasakla' :
          confirmAction.type === 'unban' ? 'Yasağı Kaldır' :
          confirmAction.type === 'makeAdmin' ? 'Admin Yap' :
          confirmAction.type === 'removeAdmin' ? 'Admin Yetkisini Kaldır' :
          confirmAction.type === 'makeAuthor' ? 'Yazar Yap' :
          confirmAction.type === 'removeAuthor' ? 'Yazar Yetkisini Kaldır' :
          'Kullanıcıyı Sil'
        }
        message={
          confirmAction.type === 'delete' ? 'Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.' :
          `Bu işlemi gerçekleştirmek istediğinizden emin misiniz?`
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

export default UserManager
