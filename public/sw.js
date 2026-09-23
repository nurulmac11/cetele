// çetele service worker: lets the app open without a network connection.
// - Pages: network first, falling back to the cached app shell when offline
// - /assets/* (content-hashed by Vite): cache first
// - Google Fonts and other same-origin files: served from cache, refreshed in the background
// Exchange-rate APIs, Supabase and analytics are never cached here; the app caches rates itself.

const CACHE = 'cetele-v1'
const APP_SHELL = '/'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

async function networkFirstPage(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(APP_SHELL, response.clone())
    return response
  } catch (err) {
    return (await cache.match(APP_SHELL)) || Response.error()
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone())
      return response
    })
    .catch(() => cached || Response.error())
  if (cached) {
    event.waitUntil(refresh)
    return cached
  }
  return refresh
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/_vercel/')) return
    if (request.mode === 'navigate') {
      event.respondWith(networkFirstPage(request))
    } else if (url.pathname.startsWith('/assets/')) {
      event.respondWith(cacheFirst(request))
    } else {
      event.respondWith(staleWhileRevalidate(request, event))
    }
    return
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, event))
  }
})
