/**
 * Service Worker for Offline Support
 * This file will be copied to the public directory during build
 */

const CACHE_NAME = 'mr7-ai-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => 
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch event - cache first, network fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // API requests - network only
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) return cached;
        
        return fetch(event.request)
          .then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/index.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing window if available
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Navigate to the specific URL if provided
            if (client.url !== new URL(urlToOpen, self.location.origin).href) {
              client.navigate(urlToOpen);
            }
            return client.focus();
          }
        }
        // Open new window if none found
        return clients.openWindow(urlToOpen);
      })
  );
});

// Notification close handler (optional cleanup)
self.addEventListener('notificationclose', (event) => {
  // Track notification dismissal for analytics if needed
  const tag = event.notification.tag;
  if (tag) {
    // Could send analytics event here
    console.log('Notification dismissed:', tag);
  }
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-chat') {
    event.waitUntil(syncPendingChats());
  }
});

async function syncPendingChats() {
  // Sync offline chat messages when back online
  const pending = await getPendingMessages();
  for (const msg of pending) {
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      });
      await removePendingMessage(msg.id);
    } catch (error) {
      console.error('Failed to sync message:', error);
    }
  }
}

async function getPendingMessages() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('pending', 'readonly');
    const store = tx.objectStore('pending');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
  });
}

async function removePendingMessage(id) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('pending', 'readwrite');
    const store = tx.objectStore('pending');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
  });
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mr7-offline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending', { keyPath: 'id' });
      }
    };
  });
}
