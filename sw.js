// Service worker: works offline after the first visit.
// Page: network first (always newest when online), cache as fallback.
// Data, images, fonts: served from cache, refreshed in the background.
const V = 'lta-v3';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !font) return; // audio, Drive etc. go straight to the network
  if (req.mode === 'navigate' || (same && /\/(index\.html)?$/.test(url.pathname))) {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(req, c)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.open(V).then(c => c.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  })));
});
