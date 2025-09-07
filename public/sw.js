// Service Worker for Kumaş Stok Yönetimi Pro
const CACHE_NAME = 'kumas-stok-v1.0.3';
const urlsToCache = [
    '/',
    '/index.html',
    '/start.html',
    '/styles.css',
    '/print.css',
    '/js/utils.js',
    '/js/firebase-config.js',
    '/js/firebase-setup.js',
    '/js/database.js',
    '/js/services.js',
    '/js/modals.js',
    '/js/pages.js',
    '/js/app.js',
    '/manifest.json'
];

// Install event
self.addEventListener('install', event => {
    console.log('🔧 Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('✅ Service Worker: Installation complete');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ Service Worker: Installation failed', error);
            })
    );
});

// Activate event
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker: Activation complete');
            return self.clients.claim();
        })
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip Firebase requests
    if (event.request.url.includes('firebase') || 
        event.request.url.includes('googleapis') ||
        event.request.url.includes('gstatic')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true })
            .then(response => {
                // Return cached version or fetch from network
                if (response) {
                    console.log('📋 Service Worker: Serving from cache', event.request.url);
                    return response;
                }
                
                console.log('🌐 Service Worker: Fetching from network', event.request.url);
                return fetch(event.request).then(response => {
                    // Don't cache non-successful responses
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone the response
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                }).catch(error => {
                    console.error('❌ Service Worker: Fetch failed', error);
                    
                    // Return offline page for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                    
                    throw error;
                });
            })
    );
});

// Background sync for Firebase
self.addEventListener('sync', event => {
    console.log('🔄 Service Worker: Background sync', event.tag);
    
    if (event.tag === 'firebase-sync') {
        event.waitUntil(
            // Firebase will handle the sync automatically
            Promise.resolve()
        );
    }
});

// Push notification support
self.addEventListener('push', event => {
    console.log('📢 Service Worker: Push received');
    
    const options = {
        body: event.data ? event.data.text() : 'Kumaş Stok Yönetimi bildirimi',
        icon: '/images/icon-192x192.png',
        badge: '/images/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Aç',
                icon: '/images/checkmark.png'
            },
            {
                action: 'close',
                title: 'Kapat',
                icon: '/images/xmark.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Kumaş Stok Yönetimi', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    console.log('📱 Service Worker: Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handler
self.addEventListener('message', event => {
    console.log('💬 Service Worker: Message received', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('🎯 Service Worker: Loaded and ready'); 