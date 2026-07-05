const CACHE_NAME = 'love-journey-v3';
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

// Fetch: Network-first for HTML/API, cache-first for static files
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip cross-origin requests (supabase, cdn, fonts etc.)
  if (url.origin !== self.location.origin) {
    return; // Let browser handle it normally
  }

  // Network-first for HTML navigation (always get fresh page)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for JS/CSS/fonts (static assets)
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
