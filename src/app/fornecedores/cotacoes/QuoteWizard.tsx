'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import Autocomplete, { AutocompleteItem } from '@/components/Autocomplete'
import Toast, { ToastType } from '@/components/Toast'
import { type SpeciesOption } from '@/lib/order-paste'
import { formatPriceBR } from '@/lib/suppliers'
import { formatDistanceKm } from '@/lib/geo'
import { buildQuoteRequestMessage, buildWaLink } from '@/lib/whatsapp'
import { createQuoteRequests, findSuppliersForSpecies, markQuoteSent } from './actions'

export interface WizardItem {
  species_id: string
  species_name: string
  quantity: number
  size: string
  order_item_id?: string | null
}

interface SupplierOffer {
  species_id: string
  common_name: string
  size: string | null
  unit_price: string | number | null
  availability: string
}

interface CandidateSupplier {
  id: string
  name: string
  contact_name: string | null
  whatsapp: string | null
  city: string | null
  state: string | null
  reliability_score: number | null
  coverage_count: number
  /** Distancia em linha reta ate o viveiro; null = fornecedor sem lat/lng. */
  distance_km: number | null
  offers: SupplierOffer[]
}

interface Props {
  allSpecies: SpeciesOption[]
  /** Nome de quem assina a mensagem (usuario logado). */
  senderName: string
  /** Pedido de origem (fluxo A); null/ausente = cotacao avulsa (fluxo B). */
  orderId?: string | null
  orderLabel?: string | null
  initialItems?: WizardItem[]
  backHref: string
  backLabel: string
}

interface ToastState {
  message: string
  type: ToastType
}

const STEPS = ['Espécies', 'Fornecedores', 'Mensagens']

/**
 * Wizard de cotacao em 3 passos: o que cotar → para quem → mensagens prontas.
 * O envio e SEMPRE manual: o sistema gera o texto e o link wa.me; o usuario
 * abre o WhatsApp, envia e marca como enviada.
 */
export default function QuoteWizard({
  allSpecies,
  senderName,
  orderId = null,
  orderLabel = null,
  initialItems = [],
  backHref,
  backLabel,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<ToastState | null>(null)
  const [step, setStep] = useState(1)

  // Passo 1
  const [items, setItems] = useState<WizardItem[]>(initialItems)
  const [autocompleteKey, setAutocompleteKey] = useState(0)

  // Passo 2
  const [candidates, setCandidates] = useState<CandidateSupplier[] | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Passo 3
  const [messages, setMessages] = useState<Record<string, string>>({})
  const [quoteIds, setQuoteIds] = useState<Record<string, string>>({})
  const [confirmed, setConfirmed] = useState(false)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const speciesItems: AutocompleteItem[] = allSpecies.map((s) => ({
    id: s.id,
    label: s.common_name,
    keywords: [
      ...(s.popular_names ?? []),
      ...(s.scientific_name ? [s.scientific_name] : []),
    ],
  }))

  const selectedSuppliers = (candidates ?? []).filter((s) => selectedIds.has(s.id))

  function showError(message: string) {
    setToast({ message, type: 'error' })
  }

  // --- Passo 1: itens ---

  function addItem(item: AutocompleteItem) {
    if (items.some((i) => i.species_id === item.id)) return
    setItems([...items, { species_id: item.id, species_name: item.label, quantity: 1, size: '' }])
    setAutocompleteKey((k) => k + 1) // limpa o input para a proxima espécie
  }

  function updateItem(index: number, patch: Partial<WizardItem>) {
    setItems(items.map((i, idx) => (idx === index ? { ...i, ...patch } : i)))
  }

  function removeItem(index: number) {
    setItems(items.filter((_, idx) => idx !== index))
  }

  function goToSuppliers() {
    if (items.length === 0 || items.some((i) => !i.quantity || i.quantity <= 0)) {
      showError('Confira as espécies e quantidades antes de continuar.')
      return
    }
    startTransition(async () => {
      try {
        const rows = (await findSuppliersForSpecies(
          items.map((i) => i.species_id),
        )) as CandidateSupplier[]
        setCandidates(rows)
        // Pre-seleciona quem cobre tudo (caso comum: poucos fornecedores certos).
        setSelectedIds(new Set(rows.filter((r) => r.coverage_count === items.length).map((r) => r.id)))
        setStep(2)
      } catch {
        showError('Erro ao buscar fornecedores.')
      }
    })
  }

  // --- Passo 2: fornecedores ---

  function toggleSupplier(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  function goToMessages() {
    if (selectedIds.size === 0) {
      showError('Selecione ao menos um fornecedor.')
      return
    }
    // Gera a mensagem padrao para quem ainda nao tem (preserva edicoes ao voltar).
    const next = { ...messages }
    for (const s of (candidates ?? []).filter((c) => selectedIds.has(c.id))) {
      if (!next[s.id]) {
        next[s.id] = buildQuoteRequestMessage({
          supplierName: s.name,
          contactName: s.contact_name,
          senderName,
          items: items.map((i) => ({
            speciesName: i.species_name,
            quantity: i.quantity,
            size: i.size || null,
          })),
        })
      }
    }
    setMessages(next)
    setStep(3)
  }

  // --- Passo 3: confirmar + enviar ---

  function confirmQuotes() {
    startTransition(async () => {
      const result = await createQuoteRequests({
        orderId,
        items: items.map((i) => ({
          species_id: i.species_id,
          quantity: i.quantity,
          size: i.size || null,
          order_item_id: i.order_item_id ?? null,
        })),
        suppliers: selectedSuppliers.map((s) => ({
          supplier_id: s.id,
          message_text: messages[s.id] ?? '',
          channel: s.whatsapp ? ('whatsapp' as const) : ('manual' as const),
        })),
      })
      if (result.error || !result.quotes) {
        showError(result.error ?? 'Erro ao registrar cotações.')
        return
      }
      const ids: Record<string, string> = {}
      for (const q of result.quotes) ids[q.supplier_id] = q.id
      setQuoteIds(ids)
      setConfirmed(true)
      setToast({ message: 'Cotações registradas! Agora é só enviar.', type: 'success' })
    })
  }

  function handleMarkSent(supplierId: string) {
    const quoteId = quoteIds[supplierId]
    if (!quoteId) return
    startTransition(async () => {
      const result = await markQuoteSent(quoteId)
      if (result.error) {
        showError(result.error)
        return
      }
      setSentIds((prev) => new Set(prev).add(quoteId))
    })
  }

  async function copyMessage(supplierId: string) {
    try {
      await navigator.clipboard.writeText(messages[supplierId] ?? '')
      setToast({ message: 'Mensagem copiada!', type: 'success' })
    } catch {
      showError('Não foi possível copiar.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-4">
        <Link href={backHref} className="text-sm text-green-300 hover:text-white mb-1 inline-block">
          ← {backLabel}
        </Link>
        <h1 className="text-xl font-bold">Cotar com fornecedores</h1>
        {orderLabel && <p className="text-sm text-green-200 mt-0.5">{orderLabel}</p>}
      </header>

      {/* Indicador de passos */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-b border-gray-200">
        {STEPS.map((label, idx) => {
          const n = idx + 1
          const isActive = n === step
          const done = n < step
          return (
            <div key={label} className="flex items-center gap-2">
              {idx > 0 && <span className="text-gray-300">—</span>}
              <span
                className={`flex items-center gap-1.5 text-sm font-semibold ${
                  isActive ? 'text-green-700' : done ? 'text-green-500' : 'text-gray-400'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    isActive
                      ? 'bg-green-700 text-white'
                      : done
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {done ? '✓' : n}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </span>
            </div>
          )
        })}
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4 pb-24">
        {/* ============ PASSO 1: especies ============ */}
        {step === 1 && (
          <>
            <p className="text-sm text-gray-600">
              O que você precisa cotar? Adicione as espécies, quantidade e tamanho desejado.
            </p>

            <Autocomplete
              key={autocompleteKey}
              items={speciesItems}
              placeholder="Buscar espécie para adicionar…"
              onSelect={addItem}
              autoFocus={items.length === 0}
            />

            {items.length === 0 ? (
              <p className="text-gray-400 text-center py-8 text-sm">
                Nenhuma espécie ainda — busque acima para adicionar.
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={item.species_id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900 min-w-0 truncate">
                        {item.species_name}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-red-500 text-sm font-semibold shrink-0"
                      >
                        Remover
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="label" htmlFor={`qw-qty-${idx}`}>Quantidade *</label>
                        <input
                          id={`qw-qty-${idx}`}
                          type="number"
                          inputMode="numeric"
                          min="1"
                          value={item.quantity || ''}
                          onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                          className="input py-2"
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor={`qw-size-${idx}`}>Tamanho (opcional)</label>
                        <input
                          id={`qw-size-${idx}`}
                          type="text"
                          value={item.size}
                          onChange={(e) => updateItem(idx, { size: e.target.value })}
                          placeholder="30-50cm, saco 17x22…"
                          className="input py-2"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={goToSuppliers}
              disabled={isPending || items.length === 0}
              className="btn-primary w-full disabled:opacity-50"
            >
              {isPending ? 'Buscando fornecedores…' : 'Continuar: escolher fornecedores'}
            </button>
          </>
        )}

        {/* ============ PASSO 2: fornecedores ============ */}
        {step === 2 && candidates && (
          <>
            <p className="text-sm text-gray-600">
              Fornecedores que já oferecem essas espécies. Marque para quem pedir orçamento.
            </p>

            {candidates.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-gray-500 text-sm">
                  Nenhum fornecedor cadastrado oferece essas espécies ainda.
                </p>
                <Link href="/fornecedores" className="text-green-700 font-semibold text-sm">
                  Cadastrar fornecedores →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {candidates.map((s) => {
                  const checked = selectedIds.has(s.id)
                  return (
                    <label
                      key={s.id}
                      className={`block bg-white rounded-xl shadow-sm border-2 p-3 cursor-pointer transition-colors ${
                        checked ? 'border-green-500' : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSupplier(s.id)}
                          className="mt-1 w-5 h-5 accent-green-700"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-gray-900 truncate">{s.name}</p>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800 shrink-0">
                              cobre {s.coverage_count} de {items.length}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {[
                              s.contact_name,
                              s.city && `${s.city}${s.state ? `/${s.state}` : ''}`,
                              formatDistanceKm(s.distance_km),
                            ]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                            {s.reliability_score != null && ` · ${'★'.repeat(s.reliability_score)}`}
                          </p>
                          <ul className="mt-1 space-y-0.5">
                            {s.offers.map((o, i) => (
                              <li key={i} className="text-xs text-gray-600">
                                {o.common_name}
                                {o.size ? ` (${o.size})` : ''}
                                {o.unit_price != null && (
                                  <span className="text-green-700 font-semibold">
                                    {' '}
                                    — {formatPriceBR(o.unit_price)}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                          {!s.whatsapp && (
                            <p className="text-xs font-semibold text-amber-600 mt-1">
                              ⚠ Sem WhatsApp — a mensagem terá que ser copiada e enviada por outro canal.
                            </p>
                          )}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100"
              >
                ← Voltar
              </button>
              <button
                type="button"
                onClick={goToMessages}
                disabled={selectedIds.size === 0}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                Continuar: revisar mensagens ({selectedIds.size})
              </button>
            </div>
          </>
        )}

        {/* ============ PASSO 3: mensagens ============ */}
        {step === 3 && (
          <>
            <p className="text-sm text-gray-600">
              {confirmed
                ? 'Cotações registradas. Abra o WhatsApp de cada fornecedor, envie e marque como enviada.'
                : 'Revise (e edite, se quiser) a mensagem de cada fornecedor antes de confirmar.'}
            </p>

            <div className="space-y-3">
              {selectedSuppliers.map((s) => {
                const quoteId = quoteIds[s.id]
                const isSent = quoteId ? sentIds.has(quoteId) : false
                const waLink = buildWaLink(s.whatsapp, messages[s.id] ?? '')
                return (
                  <div
                    key={s.id}
                    className={`bg-white rounded-xl shadow-sm border p-3 space-y-2 ${
                      isSent ? 'border-green-300 bg-green-50/40' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900 truncate">{s.name}</p>
                      {isSent && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800 shrink-0">
                          ✓ Enviada
                        </span>
                      )}
                    </div>
                    <textarea
                      value={messages[s.id] ?? ''}
                      onChange={(e) => setMessages({ ...messages, [s.id]: e.target.value })}
                      readOnly={confirmed}
                      rows={8}
                      className={`input text-sm leading-snug ${confirmed ? 'bg-gray-50 text-gray-600' : ''}`}
                    />
                    {confirmed && (
                      <div className="flex flex-wrap gap-2">
                        {waLink ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-center font-semibold py-2.5 px-3 rounded-xl bg-green-600 text-white active:scale-95 transition-transform"
                          >
                            Abrir WhatsApp
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => copyMessage(s.id)}
                            className="flex-1 font-semibold py-2.5 px-3 rounded-xl bg-gray-700 text-white"
                          >
                            Copiar mensagem
                          </button>
                        )}
                        {!isSent && (
                          <button
                            type="button"
                            onClick={() => handleMarkSent(s.id)}
                            disabled={isPending}
                            className="flex-1 font-semibold py-2.5 px-3 rounded-xl border-2 border-green-600 text-green-700 disabled:opacity-50"
                          >
                            ✓ Marquei como enviada
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {!confirmed ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100"
                >
                  ← Voltar
                </button>
                <button
                  type="button"
                  onClick={confirmQuotes}
                  disabled={isPending}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {isPending ? 'Registrando…' : `Confirmar cotações (${selectedSuppliers.length})`}
                </button>
              </div>
            ) : (
              <Link
                href="/fornecedores/cotacoes"
                className="btn-primary block text-center"
              >
                Ver acompanhamento das cotações
              </Link>
            )}
          </>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
