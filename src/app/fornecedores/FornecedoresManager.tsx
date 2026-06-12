'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import { matchesSearch, normalizeText } from '@/lib/text'
import { SUPPLIER_STATUS_META, type SupplierStatus } from '@/lib/suppliers'
import SupplierForm, { type SupplierRecord } from './SupplierForm'

export interface SupplierListRow extends SupplierRecord {
  active: boolean
  species_count: number
  species_names: string[]
  last_contacted_at: string | null
}

interface ToastState {
  message: string
  type: ToastType
}

export default function FornecedoresManager({
  initialSuppliers,
}: {
  initialSuppliers: SupplierListRow[]
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)

  // Busca tolerante por nome, contato, cidade E especies oferecidas
  // ("quem tem ipê?" — species_names ja vem agregado do servidor).
  const filtered = useMemo(() => {
    const q = search.trim()
    if (!q) return initialSuppliers
    return initialSuppliers.filter((s) => {
      if (matchesSearch(s.name, q)) return true
      if (s.contact_name && matchesSearch(s.contact_name, q)) return true
      if (s.city && matchesSearch(s.city, q)) return true
      if (s.whatsapp && normalizeText(s.whatsapp).includes(normalizeText(q))) return true
      if ((s.species_names ?? []).some((n) => matchesSearch(n, q))) return true
      return false
    })
  }, [search, initialSuppliers])

  // ─── FORMULÁRIO (novo fornecedor) ─────────────────────────
  if (mode === 'form') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-green-800 text-white px-4 py-4">
          <button
            onClick={() => setMode('list')}
            className="text-sm text-green-300 hover:text-white mb-1 inline-block"
          >
            ← Fornecedores
          </button>
          <h1 className="text-xl font-bold">Novo fornecedor</h1>
        </header>
        <div className="max-w-2xl mx-auto p-4 sm:p-6">
          <SupplierForm
            supplier={null}
            onCancel={() => setMode('list')}
            onSaved={() => {
              setToast({ message: 'Fornecedor cadastrado!', type: 'success' })
              setMode('list')
              router.refresh()
            }}
          />
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    )
  }

  // ─── LISTA ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-4">
        <Link href="/" className="text-sm text-green-300 hover:text-white mb-1 inline-block">
          ← Início
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Fornecedores</h1>
          <button
            onClick={() => setMode('form')}
            className="bg-white text-green-800 font-bold text-sm px-4 py-2 rounded-xl active:scale-95 transition-transform"
          >
            + Novo
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* P11 F2/F4/F5: atalhos de cotacao, mapa e painel */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/fornecedores/cotar"
            className="text-center font-semibold py-3 rounded-xl bg-green-600 text-white active:scale-95 transition-transform"
          >
            💬 Orçamento
          </Link>
          <Link
            href="/fornecedores/cotacoes"
            className="text-center font-semibold py-3 rounded-xl border-2 border-green-600 text-green-700 active:scale-95 transition-transform"
          >
            📋 Cotações
          </Link>
          <Link
            href="/fornecedores/mapa"
            className="text-center font-semibold py-3 rounded-xl border-2 border-green-600 text-green-700 active:scale-95 transition-transform"
          >
            🗺️ Mapa
          </Link>
          <Link
            href="/fornecedores/dashboard"
            className="text-center font-semibold py-3 rounded-xl border-2 border-green-600 text-green-700 active:scale-95 transition-transform"
          >
            📊 Painel
          </Link>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, cidade ou espécie (ex: ipê)…"
          className="input"
        />

        {filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-16">
            {initialSuppliers.length === 0
              ? 'Nenhum fornecedor cadastrado ainda.'
              : 'Nenhum fornecedor encontrado.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((s) => {
              const meta = SUPPLIER_STATUS_META[s.status as SupplierStatus]
              const speciesPreview = (s.species_names ?? []).slice(0, 4)
              return (
                <Link
                  key={s.id}
                  href={`/fornecedores/${s.id}`}
                  className="bg-white rounded-2xl shadow-sm border-2 border-transparent p-4 active:bg-green-50 block"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900 truncate">{s.name}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.badge}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-sm text-gray-500">
                        {(s.city || s.state) && (
                          <span>
                            {s.city}
                            {s.city && s.state ? '/' : ''}
                            {s.state}
                          </span>
                        )}
                        {s.whatsapp && <span>📱 {s.whatsapp}</span>}
                        {s.reliability_score != null && (
                          <span className="text-amber-500">{'★'.repeat(s.reliability_score)}</span>
                        )}
                      </div>
                      {s.species_count > 0 ? (
                        <p className="mt-1 text-sm text-green-700">
                          🌱 {s.species_count} espécie{s.species_count > 1 ? 's' : ''}
                          {speciesPreview.length > 0 && (
                            <span className="text-gray-500">
                              {' '}— {speciesPreview.join(', ')}
                              {s.species_count > speciesPreview.length ? '…' : ''}
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-gray-400">Sem espécies cadastradas</p>
                      )}
                    </div>
                    <span className="text-gray-300 text-xl shrink-0">›</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
