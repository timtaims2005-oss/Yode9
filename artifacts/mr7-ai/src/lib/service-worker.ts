/**
 * Service Worker for offline support and caching
 * Enables the app to work without internet connection
 */

// Service worker registration
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version available
          if (confirm('New version available! Reload to update?')) {
            window.location.reload();
          }
        }
      });
    });

    console.log('Service worker registered successfully');
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

// Unregister service worker (for development)
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      console.log('Service worker unregistered');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to unregister service worker:', error);
    return false;
  }
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Listen for online/offline events
export function onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// Cache API wrapper
export class CacheManager {
  private cacheName = 'mr7-ai-cache-v1';

  async open(): Promise<Cache> {
    return await caches.open(this.cacheName);
  }

  async get(request: RequestInfo | URL): Promise<Response | undefined> {
    const cache = await this.open();
    return await cache.match(request);
  }

  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    const cache = await this.open();
    await cache.put(request, response);
  }

  async delete(request: RequestInfo | URL): Promise<boolean> {
    const cache = await this.open();
    return await cache.delete(request);
  }

  async keys(): Promise<readonly Request[]> {
    const cache = await this.open();
    return await cache.keys();
  }

  async clear(): Promise<void> {
    const cache = await this.open();
    const keys = await cache.keys();
    await Promise.all(keys.map(key => cache.delete(key)));
  }
}

// IndexedDB wrapper for offline data storage
export class OfflineStorage {
  private dbName = 'mr7-ai-offline';
  private dbVersion = 1;

  async open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('messages')) {
          db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  async save(storeName: string, data: any): Promise<void> {
    const db = await this.open();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName: string, key: string): Promise<any> {
    const db = await this.open();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName: string): Promise<any[]> {
    const db = await this.open();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    const db = await this.open();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Sync queue for offline operations
export class SyncQueue {
  private queueName = 'mr7-ai-sync-queue';
  private offlineStorage = new OfflineStorage();

  async addToQueue(operation: { type: string; data: any; timestamp: number }): Promise<void> {
    const queue = (await this.offlineStorage.get('settings', this.queueName)) || { items: [] };
    queue.items.push(operation);
    await this.offlineStorage.save('settings', queue);
  }

  async processQueue(): Promise<void> {
    if (!isOnline()) return;

    const queue = (await this.offlineStorage.get('settings', this.queueName)) || { items: [] };
    
    for (const operation of queue.items) {
      try {
        // Process each operation
        await this.processOperation(operation);
      } catch (error) {
        console.error('Failed to process queue item:', error);
      }
    }

    // Clear queue after processing
    await this.offlineStorage.delete('settings', this.queueName);
  }

  private async processOperation(operation: any): Promise<void> {
    // Implement operation processing logic
    console.log('Processing operation:', operation);
  }
}
