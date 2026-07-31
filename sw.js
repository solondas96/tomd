const CACHE = 'tomd-v5';
const ASSETS = [
  './', './index.html', './css/style.css',
  './js/main.js', './js/config.js', './js/state.js',
  './js/utils.js', './js/dom.js', './js/ui.js',
  './js/file-handler.js', './js/features.js',
  './js/converters/index.js', './js/converters/pdf.js', './js/converters/formats.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(ASSETS.map(url => c.add(url)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
    // Only cache same-origin responses to avoid opaque response bloat
    if (resp.ok && resp.type === 'basic') {
      const clone = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
    }
    return resp;
  }).catch(() => new Response('Offline', { status: 503 }))));
});
