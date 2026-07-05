const CACHE_NAME = 'love-journey-v4';
const STATIC_ASSETS = [
  './',
  './index.html',
  './app.js',
  './config.js',
  './storage.js',
  './journey.js',
  './player.js',
  './themes.js',
  './style.css',
  './manifest.json'
];

// Install: cache static assets - don't fail if one asset fails
self.addEventListener('install', (e) => {
  self.skipWaiting(); // Activate immediately without waiting
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(err => {
          console.warn('[SW] Failed to cache:', url, err);
        }))
      );
    })
  );
});

// Activate: claim clients immediately, clean old caches
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

// Fetch: Network-first for JS, CSS, HTML/API, cache-first for other static resources (images/fonts)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip cross-origin requests (supabase, cdn, fonts etc.)
  if (url.origin !== self.location.origin) {
    return; // Let browser handle it normally
  }

  // Network-first for HTML navigation, JS, CSS, and manifest files
  if (
    e.request.mode === 'navigate' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
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

  // Cache-first for other static assets (images, icons, etc.)
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
