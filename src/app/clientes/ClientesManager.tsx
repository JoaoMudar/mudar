'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import { matchesSearch, normalizeText } from '@/lib/text'
import {
  isFiscallyComplete,
  onlyDigits,
  formatDocument,
  type FiscalCustomer,
} from '@/lib/customers'
import CustomerFiscalForm, { type CustomerRecord } from './CustomerFiscalForm'
import { toggleCustomerActive, getCustomerById } from './actions'

interface CustomerRow extends CustomerRecord {
  active: boolean
}

interface ToastState {
  message: string
  type: ToastType
}

function fiscalOf(c: CustomerRow): FiscalCustomer {
  return {
    name: c.name,
    person_type: c.person_type,
    document: c.document,
    email: c.email,
    legal_name: c.legal_name,
    trade_name: c.trade_name,
    state_registration: c.state_registration,
    ie_exempt: c.ie_exempt,
    zip_code: c.zip_code,
    street: c.street,
    address_number: c.address_number,
    complement: c.complement,
    neighborhood: c.neighborhood,
    city: c.city,
    state: c.state,
  }
}

// Selo de completude derivado (sem ida ao banco): simples / incompleto / completo.
function fiscalBadge(c: CustomerRow): { label: string; cls: string } {
  if (c.person_type == null) return { label: 'simples', cls: 'bg-gray-100 text-gray-500' }
  if (isFiscallyComplete(fiscalOf(c))) return { label: 'completo', cls: 'bg-green-100 text-green-700' }
  return { label: 'incompleto', cls: 'bg-amber-100 text-amber-700' }
}

function typeBadge(pt: 'pf' | 'pj' | null): { label: string; cls: string } {
  if (pt === 'pf') return { label: 'PF', cls: 'bg-blue-100 text-blue-700' }
  if (pt === 'pj') return { label: 'PJ', cls: 'bg-purple-100 text-purple-700' }
  return { label: '—', cls: 'bg-gray-100 text-gray-400' }
}

export default function ClientesManager({
  initialCustomers,
}: {
  initialCustomers: CustomerRow[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [editing, setEditing] = useState<CustomerRow | null>(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)

  function showToast(message: string, type: ToastType) {
    setToast({ message, type })
  }

  const filtered = useMemo(() => {
    const q = search.trim()
    if (!q) return initialCustomers
    const digits = onlyDigits(q)
    return initialCustomers.filter((c) => {
      if (matchesSearch(c.name, q)) return true
      if (c.legal_name && matchesSearch(c.legal_name, q)) return true
      if (c.trade_name && matchesSearch(c.trade_name, q)) return true
      if (c.phone && normalizeText(c.phone).includes(normalizeText(q))) return true
      if (digits && c.document && c.document.includes(digits)) return true
      return false
    })
  }, [search, initialCustomers])

  function openCreate() {
    setEditing(null)
    setMode('form')
  }
  function openEdit(c: CustomerRow) {
    setEditing(c)
    setMode('form')
  }

  function handleToggleActive(c: CustomerRow) {
    if (!window.confirm(`Deseja ${c.active ? 'inativar' : 'reativar'} "${c.name}"?`)) return
    startTransition(async () => {
      const result = await toggleCustomerActive(c.id, !c.active)
      if (result.error) {
        showToast(`Erro: ${result.error}`, 'error')
        return
      }
      showToast(c.active ? 'Cliente inativado.' : 'Cliente reativado!', 'success')
      router.refresh()
    })
  }

  // ─── FORMULÁRIO ───────────────────────────────────────────
  if (mode === 'form') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-green-800 text-white px-4 py-4">
          <button
            onClick={() => setMode('list')}
            className="text-sm text-green-300 hover:text-white mb-1 inline-block"
          >
            ← Clientes
          </button>
          <h1 className="text-xl font-bold">{editing ? 'Editar cliente' : 'Novo cliente'}</h1>
        </header>
        <div className="max-w-2xl mx-auto p-4 sm:p-6">
          <CustomerFiscalForm
            key={editing?.id ?? 'novo'}
            customer={editing}
            onCancel={() => setMode('list')}
            onSaved={() => {
              showToast(editing ? 'Cliente atualizado!' : 'Cliente cadastrado!', 'success')
              setMode('list')
              router.refresh()
            }}
            onMerged={(_originalId, movedOrders) => {
              showToast(
                movedOrders > 0
                  ? `Cadastros unidos — ${movedOrders} pedido(s) movido(s).`
                  : 'Cadastros unidos.',
                'success',
              )
              setMode('list')
              router.refresh()
            }}
            onUseExisting={async (id) => {
              // Cliente que ja tem o documento: abre o cadastro existente para edicao.
              const existing = initialCustomers.find((c) => c.id === id)
              if (existing) {
                setEditing(existing)
                return
              }
              // Pode estar inativo (fora da lista ativa) — busca direto no banco.
              const fetched = (await getCustomerById(id)) as CustomerRow | null
              if (fetched) {
                setEditing(fetched)
              } else {
                showToast('Não foi possível abrir o cliente existente.', 'error')
              }
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
          <h1 className="text-xl font-bold">Clientes</h1>
          <button
            onClick={openCreate}
            className="bg-white text-green-800 font-bold text-sm px-4 py-2 rounded-xl active:scale-95 transition-transform"
          >
            + Novo cliente
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, telefone ou documento…"
          className="input"
        />

        {filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-16">
            {initialCustomers.length === 0 ? 'Nenhum cliente cadastrado.' : 'Nenhum cliente encontrado.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((c) => {
              const tb = typeBadge(c.person_type)
              const fb = fiscalBadge(c)
              const doc = formatDocument(c.document, c.person_type)
              return (
                <div
                  key={c.id}
                  className={`bg-white rounded-2xl shadow-sm border-2 p-4 ${c.active ? 'border-transparent' : 'border-gray-200 opacity-60'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tb.cls}`}>
                          {tb.label}
                        </span>
                        <p className="font-bold text-gray-900 truncate">{c.name}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${fb.cls}`}>
                          {fb.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-sm text-gray-500">
                        {doc && <span>{doc}</span>}
                        {c.phone && <span>{c.phone}</span>}
                        {(c.city || c.state) && (
                          <span>
                            {c.city}
                            {c.city && c.state ? '/' : ''}
                            {c.state}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => openEdit(c)}
                        className="text-sm font-semibold text-green-700 bg-green-50 px-3 py-2 rounded-xl"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleActive(c)}
                        disabled={isPending}
                        className={`text-sm font-semibold px-3 py-2 rounded-xl ${c.active ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-100'}`}
                      >
                        {c.active ? 'Inativar' : 'Reativar'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
