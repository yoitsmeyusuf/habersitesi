import React, { useState, useEffect, useCallback } from 'react';
import logger from '../utils/logger'
import api from '../services/api';

const PushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [permission, setPermission] = useState('default');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const checkSupport = () => {
    const supported = 'serviceWorker' in navigator && 
                     'PushManager' in window && 
                     'Notification' in window;
    setIsSupported(supported);
  };

  const checkPermission = () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  };
  const checkLoginStatus = () => {
    const token = api.getToken();
    logger.log('Current token:', token); // Debug log
    setIsLoggedIn(!!token);
  };

  const checkSubscription = useCallback(async () => {
    if (!isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        setSubscription(existingSubscription);
        setIsSubscribed(true);
      }
    } catch (error) {
      logger.error('Error checking subscription:', error);
    }
  }, [isSupported]);
  useEffect(() => {
    checkSupport();
    checkPermission();
    checkLoginStatus();
    checkSubscription();
  }, [checkSubscription]);

  const requestPermission = async () => {
    if (!isSupported) {
      alert('Tarayıcınız push bildirimleri desteklemiyor.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        return true;
      } else {
        alert('Bildirimleri etkinleştirmek için izin gerekli.');
        return false;
      }
    } catch (error) {
      logger.error('Permission request error:', error);
      return false;
    }
  };
  const subscribe = async () => {
    if (!isLoggedIn) {
      alert('Bildirimler için önce giriş yapmanız gerekiyor.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Request permission first
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setIsLoading(false);
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;      // Get VAPID public key from server
      const vapidResponse = await api.getPublicVapidKey();
      if (vapidResponse.success === false) {
        throw new Error(vapidResponse.message);
      }

      // Backend'den gelen response formatını kontrol et
      const publicKey = vapidResponse.publicKey || vapidResponse.data?.publicKey;
      if (!publicKey) {
        throw new Error('VAPID public key bulunamadı');
      }

      // Subscribe to push notifications
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });      // Send subscription to server
      const subscriptionData = {
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(pushSubscription.getKey('p256dh')),
          auth: arrayBufferToBase64(pushSubscription.getKey('auth'))
        }
      };

      logger.log('Sending subscription with token:', api.getToken()); // Debug log
      const result = await api.subscribeToNotifications(subscriptionData);
      
      if (result.success === false) {
        throw new Error(result.message);
      }
      
      setSubscription(pushSubscription);
      setIsSubscribed(true);
      alert('Bildirimler başarıyla etkinleştirildi!');
    } catch (error) {
      logger.error('Subscription error:', error);
      alert('Bildirim aboneliği başarısız: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };  const unsubscribe = async () => {
    if (!isLoggedIn) {
      alert('Bu işlem için giriş yapmanız gerekiyor.');
      return;
    }

    setIsLoading(true);
    
    try {
      if (subscription) {
        await subscription.unsubscribe();
        
        // Notify server
        const result = await api.unsubscribeFromNotifications(subscription.endpoint);
        if (result.success === false) {
          logger.warn('Server unsubscribe failed:', result.message);
        }
        
        setSubscription(null);
        setIsSubscribed(false);
        alert('Bildirimler başarıyla kapatıldı.');
      }
    } catch (error) {
      logger.error('Unsubscription error:', error);
      alert('Bildirim aboneliği iptal edilemedi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  // Helper functions
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Bildirimler Desteklenmiyor
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>Tarayıcınız push bildirimleri desteklemiyor. Bildirimleri kullanmak için modern bir tarayıcı gereklidir.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Push Bildirimleri</h3>
          <p className="mt-1 text-sm text-gray-500">
            Yeni haberler için anında bildirim alın
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {permission === 'granted' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              İzin Verildi
            </span>
          )}
          {permission === 'denied' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              İzin Reddedildi
            </span>
          )}
        </div>
      </div>

      <div className="mt-6">
        {isSubscribed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5l-5-5h5v-6h0V9.5a2.5 2.5 0 1 1 5 0V11h0v6z" />
              </svg>
              <span className="text-sm text-gray-700">Bildirimler etkin</span>
            </div>            <button
              onClick={unsubscribe}
              disabled={isLoading || !isLoggedIn}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'İşleniyor...' : 'Bildirimleri Kapat'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5l-5-5h5v-6h0V9.5a2.5 2.5 0 1 1 5 0V11h0v6z" />
              </svg>
              <span className="text-sm text-gray-700">Bildirimler kapalı</span>
            </div>            <button
              onClick={subscribe}
              disabled={isLoading || permission === 'denied' || !isLoggedIn}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'İşleniyor...' : 'Bildirimleri Aç'}
            </button>
          </div>
        )}      </div>

      {!isLoggedIn && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Push bildirimleri kullanmak için önce giriş yapmanız gerekiyor.
              </p>
            </div>
          </div>
        </div>
      )}

      {permission === 'denied' && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-700">
            Bildirim izni reddedildi. Tarayıcı ayarlarından site için bildirimleri etkinleştirebilirsiniz.
          </p>
        </div>
      )}
    </div>
  );
};

export default PushNotifications;
