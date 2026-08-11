// v2: parou de cachear /api. Trocar o nome do cache e o que faz o `activate`
// abaixo apagar o cache antigo — sem isso, as respostas de API ja gravadas na
// v1 continuariam sendo servidas.
const CACHE_NAME = 'viveiro-mudar-v2'

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

  const url = new URL(event.request.url)

  // Nunca cachear /api. Duas razões:
  //   1. /api/notifications é por usuário — num aparelho compartilhado, o
  //      cache serviria as notificações de quem entrou antes.
  //   2. Mesmo com um só usuário, a resposta cacheada é sempre desatualizada,
  //      e notificação velha é pior que nenhuma.
  // /api/fotos fica de fora do cache do service worker de propósito: já é
  // imutável e tem Cache-Control de um ano, então o cache HTTP do navegador
  // dá conta sem duplicar o armazenamento.
  if (url.pathname.startsWith('/api/')) return

  // Terceiros (ex.: tiles do OpenStreetMap) não entram no nosso cache.
  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Só respostas completas e bem-sucedidas. Cachear um 404 ou um 206
        // (range) deixaria a página quebrada offline, de forma persistente.
        if (response.ok && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        // Sem rede — tenta servir do cache
        return caches.match(event.request)
      })
  )
})
