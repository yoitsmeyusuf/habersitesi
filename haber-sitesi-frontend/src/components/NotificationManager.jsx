import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { sanitizeText } from '../utils/security';

const NotificationManager = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Form state for sending new notifications
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    url: '',
    icon: '',
    newsId: ''
  });
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getNotificationHistory(currentPage, 10);
      if (response.success === false) {
        throw new Error(response.message);
      }
      
      // Backend returns {notifications: [], page, pageSize}
      setNotifications(response.notifications || []);
      // For pagination, we need total count - for now use notifications length
      setTotalPages(Math.ceil((response.notifications?.length || 0) / 10));
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);
  const handleTestNotification = async () => {
    setIsLoading(true);
    try {
      const response = await api.sendTestNotification();
      if (response.success === false) {
        throw new Error(response.message);
      }
      alert('Test bildirimi gönderildi!');
      loadNotifications(); // Refresh the list
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Test bildirimi gönderirken hata oluştu: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Input validation
      if (!formData.title.trim()) {
        throw new Error('Başlık gereklidir.');
      }
      
      if (!formData.body.trim()) {
        throw new Error('İçerik gereklidir.');
      }
      
      if (formData.title.length > 100) {
        throw new Error('Başlık 100 karakterden uzun olamaz.');
      }
      
      if (formData.body.length > 500) {
        throw new Error('İçerik 500 karakterden uzun olamaz.');
      }
      
      // URL validation if provided
      if (formData.url && formData.url.trim()) {
        const urlPattern = /^(\/[^\s]*|https?:\/\/[^\s]+)$/;
        if (!urlPattern.test(formData.url.trim())) {
          throw new Error('Geçerli bir URL formatı girin (örn: /haber/123 veya https://example.com)');
        }
      }
      
      // Icon URL validation if provided
      if (formData.icon && formData.icon.trim()) {
        const iconPattern = /^https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|svg)$/i;
        if (!iconPattern.test(formData.icon.trim())) {
          throw new Error('Geçerli bir ikon URL\'si girin (.png, .jpg, .jpeg, .gif, .svg)');
        }
      }
      
      // News ID validation if provided
      if (formData.newsId && formData.newsId.trim()) {
        const newsId = parseInt(formData.newsId);
        if (isNaN(newsId) || newsId <= 0) {
          throw new Error('Haber ID geçerli bir sayı olmalıdır.');
        }
      }
      
      // Sanitize inputs
      const sanitizedData = {
        title: sanitizeText(formData.title.trim()),
        body: sanitizeText(formData.body.trim()),
        url: formData.url ? sanitizeText(formData.url.trim()) : undefined,
        icon: formData.icon ? sanitizeText(formData.icon.trim()) : undefined,
        newsId: formData.newsId ? parseInt(formData.newsId) : undefined
      };

      const response = await api.sendNotification(sanitizedData);

      if (response.success === false) {
        throw new Error(response.message);
      }
      
      alert('Bildirim başarıyla gönderildi!');
      setFormData({
        title: '',
        body: '',
        url: '',
        icon: '',
        newsId: ''
      });
      setIsFormOpen(false);
      loadNotifications(); // Refresh the list
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Bildirim gönderirken hata oluştu: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('tr-TR');
  };

  return (
    <div className="space-y-6">
      {/* Header with Send Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bildirim Yönetimi</h2>
          <p className="text-gray-600">Push bildirimlerini gönder ve geçmişi incele</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleTestNotification}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            🧪 Test Bildirimi
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Yeni Bildirim Gönder
          </button>
        </div>
      </div>

      {/* Send Notification Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Yeni Bildirim Gönder</h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Başlık *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Bildirim başlığı"
                  />
                </div>

                <div>
                  <label htmlFor="body" className="block text-sm font-medium text-gray-700">
                    İçerik *
                  </label>
                  <textarea
                    id="body"
                    name="body"
                    value={formData.body}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Bildirim içeriği"
                  />
                </div>

                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                    URL (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    id="url"
                    name="url"
                    value={formData.url}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="/haber/123 veya tam URL"
                  />
                </div>

                <div>
                  <label htmlFor="icon" className="block text-sm font-medium text-gray-700">
                    İkon URL (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    id="icon"
                    name="icon"
                    value={formData.icon}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="https://example.com/icon.png"
                  />
                </div>

                <div>
                  <label htmlFor="newsId" className="block text-sm font-medium text-gray-700">
                    Haber ID (Opsiyonel)
                  </label>
                  <input
                    type="number"
                    id="newsId"
                    name="newsId"
                    value={formData.newsId}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="123"
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isLoading ? 'Gönderiliyor...' : 'Bildirim Gönder'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Notifications History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Bildirim Geçmişi</h3>
        </div>

        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Yükleniyor...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5l-5-5h5v-6h0V9.5a2.5 2.5 0 1 1 5 0V11h0v6z" />
            </svg>
            <p className="mt-2">Henüz bildirim gönderilmemiş</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div key={notification.id} className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {notification.isSent ? (
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {notification.isSent ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Gönderildi
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Bekliyor
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className="mt-1 text-sm text-gray-600">{notification.body}</p>
                    
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      <span>Oluşturulma: {formatDate(notification.createdAt)}</span>
                      {notification.sentAt && (
                        <span>Gönderilme: {formatDate(notification.sentAt)}</span>
                      )}
                      {notification.newsId && (
                        <span>Haber ID: {notification.newsId}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Önceki
              </button>
              
              <span className="text-sm text-gray-700">
                Sayfa {currentPage} / {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationManager;
