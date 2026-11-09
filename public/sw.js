// numa PWA Service Worker
const CACHE_NAME = 'numa-pwa-v12-pure-purge';

const STATIC_ASSETS = [
  '/manifest.json',
  '/manifest.webmanifest',
  '/brand/numa-symbol.png',
  '/brand/numa-icon.png',
  '/brand/numa.png',
  '/brand/numa-white.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'PURGE_CACHE') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    });
  }
});

// Install Event: cache core static branding assets & skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: aggressively purge ALL obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Bypass non-GET requests, Chrome extensions, and API endpoints
  if (req.method !== 'GET' || url.protocol.startsWith('chrome-extension') || url.pathname.startsWith('/api/')) {
    return;
  }

  // 2. Static Brand & Icon assets: Cache-First
  if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/brand/')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // 3. Next.js Static Chunks (_next/static/): Network-First to guarantee latest code
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return response;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 4. HTML Navigation requests: Network-First with graceful 200 fallback
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req).catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const cachedHome = await caches.match('/');
        if (cachedHome) return cachedHome;
        return new Response(
          '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>numa</title><style>body{background:#121214;color:#f5f5f7;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:24px;box-sizing:border-box;}h2{margin-bottom:8px;}p{color:#86868b;font-size:14px;}button{background:#00e599;color:#000;border:none;padding:12px 24px;border-radius:12px;font-weight:600;margin-top:20px;cursor:pointer;font-size:14px;}</style></head><body><div><h2>numa</h2><p>Sin conexi\u00f3n a internet para sincronizar en tiempo real.</p><button onclick="location.reload()">Reintentar conexi\u00f3n</button></div></body></html>',
          {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        );
      })
    );
    return;
  }
});
