'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silencia erro se SW não carregar (ex: HTTP em dev)
      })
    }
  }, [])

  return null
}
