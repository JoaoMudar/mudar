'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { revokeSession, revokeOtherSessions, type SessionRow } from './actions'

// Rotulo amigavel do aparelho a partir do user-agent (heuristica simples).
function deviceLabel(ua: string | null): string {
  if (!ua) return 'Aparelho desconhecido'
  const browser = /Edg/.test(ua)
    ? 'Edge'
    : /Chrome|CriOS/.test(ua)
      ? 'Chrome'
      : /Firefox|FxiOS/.test(ua)
        ? 'Firefox'
        : /Safari/.test(ua)
          ? 'Safari'
          : 'Navegador'
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(ua)
      ? 'iPhone/iPad'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X/.test(ua)
          ? 'Mac'
          : /Linux/.test(ua)
            ? 'Linux'
            : ''
  return os ? `${browser} • ${os}` : browser
}

function fmt(dt: string): string {
  const d = new Date(dt)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SessoesClient({
  initialSessions,
}: {
  initialSessions: SessionRow[]
}) {
  const [sessions, setSessions] = useState(initialSessions)
  const [isPending, startTransition] = useTransition()

  function handleRevoke(id: string) {
    startTransition(async () => {
      await revokeSession(id)
      setSessions((s) => s.filter((x) => x.id !== id))
    })
  }

  function handleRevokeOthers() {
    startTransition(async () => {
      await revokeOtherSessions()
      setSessions((s) => s.filter((x) => x.is_current))
    })
  }

  const hasOthers = sessions.some((s) => !s.is_current)

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-green-700 font-bold text-2xl">
            ←
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Aparelhos conectados</h1>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Estes são os aparelhos com login ativo na sua conta. Encerre qualquer um
          que você não reconheça.
        </p>

        {hasOthers && (
          <button
            onClick={handleRevokeOthers}
            disabled={isPending}
            className="btn-secondary mb-4"
          >
            Encerrar todas as outras sessões
          </button>
        )}

        {sessions.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Nenhuma sessão ativa.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800">
                    {deviceLabel(s.user_agent)}
                    {s.is_current && (
                      <span className="ml-2 text-xs text-green-700 font-bold">
                        • este aparelho
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">IP: {s.ip ?? '—'}</p>
                  <p className="text-xs text-gray-400">
                    Último acesso: {fmt(s.last_seen_at)}
                  </p>
                </div>
                {!s.is_current && (
                  <button
                    onClick={() => handleRevoke(s.id)}
                    disabled={isPending}
                    className="text-red-600 text-sm font-medium shrink-0"
                  >
                    Encerrar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
