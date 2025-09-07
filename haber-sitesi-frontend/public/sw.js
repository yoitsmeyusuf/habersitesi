// Service Worker for Push Notifications
const CACHE_NAME = 'haber-sitesi-v2';

// Install event (no aggressive skipWaiting to avoid reload loops)
self.addEventListener('install', () => {
  // no-op
});

// Activate event (no clients.claim to avoid immediate control changes)
self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.resolve());
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  let data = {
    title: 'Yeni Haber',
    body: 'Yeni bir haber mevcut',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    url: '/',
    tag: 'default'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-72x72.png',
    tag: data.tag || 'notification',
    data: { url: data.url },
    actions: [
      {
        action: 'open',
        title: 'Haberi Aç'
      },
      {
        action: 'close',
        title: 'Kapat'
      }
    ],
    requireInteraction: false,
    silent: false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window/tab is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync (optional for offline functionality)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      Promise.resolve()
    );
  }
});

// Fetch event: let network handle everything (avoid SW caching overhead)
self.addEventListener('fetch', () => { /* pass-through */ })

// Message handling for communication with main thread
// Message handler disabled for skipWaiting to prevent forced reloads
self.addEventListener('message', () => {})

// Error handling
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled promise rejection:', event.reason);
});
