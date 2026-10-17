/* Tempo service worker: app-shell cache so the tracker works courtside without signal.
   Built assets are content-hashed, so stale entries are harmless and replaced on next load. */
const CACHE = 'tempo-shell-v1'
const SHELL = ['./', './index.html', './manifest.webmanifest', './favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return
  if (req.mode === 'navigate') {
    // Network first for the page itself so updates land, fall back to the cached shell offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }
  // Cache first for hashed assets; populate the cache from the network.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(req, copy))
          }
          return res
        }),
    ),
  )
})
