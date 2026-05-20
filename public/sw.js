const CACHE_NAME = 'viveiro-mudar-v1'

// Arquivos essenciais para cache offline
const PRECACHE_URLS = [
  '/',
  '/icons/icon.svg',
  '/icons/icon-192.png',
]

// Instala o service worker e faz cache dos arquivos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// Limpa caches antigos quando uma nova versão é ativada
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Estratégia: network-first com fallback para cache
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET e de API externa
  if (event.request.method !== 'GET') return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Salva a resposta no cache para uso offline
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return response
      })
      .catch(() => {
        // Sem rede — tenta servir do cache
        return caches.match(event.request)
      })
  )
})
