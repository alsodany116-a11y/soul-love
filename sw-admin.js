const CACHE_NAME = 'love-hunt-admin-v5';
const STATIC_ASSETS = [
  './',
  './index.html',
  './admin.js',
  './style.css',
  './config.js',
  './storage.js',
  './themes.js',
  './manifest-admin.json'
];

// Install: cache static assets without crashing
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(err => {
          console.warn('[Admin SW] Failed to cache:', url, err);
        }))
      );
    })
  );
});

// Activate: claim clients, remove old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys =>
        Promise.all(
          keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        )
      )
    ])
  );
});

// Fetch: network-first for HTML/JS/CSS, cache-first for other files (images/icons)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip cross-origin (supabase, CDN, fonts)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network-first for navigation, JS, CSS, manifest, and root paths
  if (
    e.request.mode === 'navigate' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.htm') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('/')
  ) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('./index.html') : null)))
    );
    return;
  }

  // Cache-first for static assets
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
