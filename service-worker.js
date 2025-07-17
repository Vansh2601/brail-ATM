/* service-worker.js */

const CACHE_VERSION = 'v1.0.0';        // bump when you change files
const CACHE_NAME = `braille-bank-${CACHE_VERSION}`;

// List of core files to precache (update if file names change)
const CORE_ASSETS = [
  './',              // GitHub Pages sometimes needs this
  './atm.html',      // main app screen
  './manifest.json',
  './service-worker.js',
  // Add CSS/JS/image assets if you split them out:
  // './styles.css',
  // './script.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: Precache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => k.startsWith('braille-bank-') && k !== CACHE_NAME)
            .map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch handler: cache-first for same-origin, network fallback
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== 'GET') return;

  // Same-origin requests: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req)
        .then(cached => {
          if (cached) {
            // Update in background
            event.waitUntil(updateCache(req));
            return cached;
          }
          // Not cached: fetch & cache
          return fetch(req)
            .then(res => {
              cachePut(req, res.clone());
              return res;
            })
            .catch(() => offlineResponse(req));
        })
    );
  } else {
    // Cross-origin: network-first, fallback cache, then offline
    event.respondWith(
      fetch(req)
        .then(res => {
          cachePut(req, res.clone());
          return res;
        })
        .catch(() =>
          caches.match(req).then(cached => cached || offlineResponse(req))
        )
    );
  }
});

// Put response in current cache
function cachePut(request, response) {
  caches.open(CACHE_NAME).then(cache => cache.put(request, response));
}

// Try to update cache (no blocking)
function updateCache(request) {
  return fetch(request)
    .then(res => cachePut(request, res.clone()))
    .catch(() => {}); // ignore errors (offline)
}

// Basic offline fallback: return minimal HTML
function offlineResponse(request) {
  if (request.mode === 'navigate') {
    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head>
       <body style="background:#111;color:#0f0;font-family:monospace;padding:1em;">
       <h1>Offline</h1><p>The Braille Bank ATM is not available offline for this page.</p>
       <p>Try again when you're connected.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
  return Response.error();
}
