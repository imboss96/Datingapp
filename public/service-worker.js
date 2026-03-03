const CACHE_VERSION = 'v2';
const CACHE_NAME = `lunesa-${CACHE_VERSION}`;
const STATIC_CACHE = `lunesa-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `lunesa-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `lunesa-images-${CACHE_VERSION}`;

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// Install event - pre-cache essential files
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(urlsToCache).catch(err => {
          console.log('[SW] Cache addAll error:', err);
          // Continue even if some files fail
        });
      })
    ]).then(() => {
      self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheName.includes(CACHE_VERSION)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Network first for API, Cache first for assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests and service worker requests
  if (!url.origin.includes(self.location.origin) || request.url.includes('service-worker')) {
    return;
  }

  // API requests - Network First
  if (url.pathname.includes('/api/') || url.pathname.includes('/ws')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Try to return cached API response
          return caches.match(request).then(response => {
            return response || new Response(
              JSON.stringify({ error: 'Offline - No cached data available' }),
              { status: 503, statusText: 'Service Unavailable', headers: new Headers({ 'Content-Type': 'application/json' }) }
            );
          });
        })
    );
    return;
  }

  // Image requests - Cache First
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(IMAGE_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          // Return a placeholder if offline
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#f0f0f0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="#999">Offline</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        });
      })
    );
    return;
  }

  // CSS, JS, and other static assets - Cache First
  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'font') {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          console.log('[SW] Failed to fetch:', url.pathname);
          return new Response('Resource not available offline', { status: 503 });
        });
      })
    );
    return;
  }

  // HTML and everything else - Network First, fallback to cache
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then(response => {
          return response || caches.match('/index.html');
        });
      })
  );
});

// Push event - display notification
self.addEventListener('push', event => {
  try {
    const data = event.data ? event.data.json() : { title: 'New Notification', body: '' };
    const title = data.title || 'New Notification';
    const options = {
      body: data.body || '',
      icon: '/src/assets/images/logo/logo.png',
      badge: '/src/assets/images/logo/logo.png',
      data: data.data || {},
      tag: data.tag || undefined,
      renotify: data.renotify || false,
      vibrate: [100, 50, 100],
      requireInteraction: false
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[SW] Error handling push event:', err);
  }
});

// Notification click - focus or open app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync for messages when back online
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(
      // Add sync logic here to send queued messages
      Promise.resolve()
    );
  }
});

// Push event - display notification
self.addEventListener('push', function(event) {
  try {
    const data = event.data ? event.data.json() : { title: 'New Notification', body: '' };
    const title = data.title || 'New Notification';
    const options = {
      body: data.body || '',
      icon: '/css/images/icons-192.png',
      badge: '/css/images/badge-72.png',
      data: data.data || {},
      tag: data.tag || undefined,
      renotify: data.renotify || false
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[SW] Error handling push event:', err);
  }
});

// Notification click - focus or open app
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
