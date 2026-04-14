'use client'

import { useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'offline'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
}

const STYLES: Record<ToastType, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  offline: 'bg-yellow-500 text-black',
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✗',
  offline: '⚡',
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      role="alert"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg text-base font-semibold z-50 animate-fade-in ${STYLES[type]}`}
    >
      <span className="text-xl leading-none">{ICONS[type]}</span>
      <span>{message}</span>
    </div>
  )
}
