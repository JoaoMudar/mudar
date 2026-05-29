'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import Autocomplete, { AutocompleteItem } from '@/components/Autocomplete'
import { updateOrderAfterReview } from '../../actions'
import { createSpeciesQuick } from '@/app/admin/especies/actions'
import { buildAvailabilityNote, type ReviewItemInput } from '@/lib/orders'

interface Species {
  id: string
  common_name: string
  tags?: string[] | null
}
interface Container {
  id: string
  name: string
}
interface CurrentItem {
  id: string
  species_id: string | null
  species_name: string | null
  container_id: string
  container_name: string
  quantity: number
  is_generic: boolean
  is_available: boolean | null
  available_quantity: number | null
  available_container_name: string | null
  availability_notes: string | null
}

interface Props {
  orderId: string
  orderNumber: number
  orderNotes: string | null
  items: CurrentItem[]
  species: Species[]
  containers: Container[]
}

interface Row {
  key: string
  id?: string
  is_generic: boolean
  species_id: string
  species_label: string
  container_id: string
  quantity: string
  is_available: boolean | null
  is_partial: boolean
  partial_note: string | null
  notes: string | null
}

interface ToastState {
  message: string
  type: ToastType
}

let seq = 0
/** Nova linha; herda recipiente e quantidade do `template` (nunca a especie). */
function newRow(template?: Pick<Row, 'container_id' | 'quantity'>): Row {
  seq += 1
  return {
    key: `e${seq}`,
    is_generic: false,
    species_id: '',
    species_label: '',
    container_id: template?.container_id ?? '',
    quantity: template?.quantity ?? '',
    is_available: null,
    is_partial: false,
    partial_note: null,
    notes: null,
  }
}

export default function EditItemsForm({
  orderId,
  orderNumber,
  orderNotes,
  items,
  species,
  containers,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<ToastState | null>(null)
  const [focusKey, setFocusKey] = useState<string | null>(null)
  // Lista local de especies (cresce com o cadastro rapido "+ Criar").
  const [speciesList, setSpeciesList] = useState<Species[]>(species)
  const [rows, setRows] = useState<Row[]>(() =>
    items.map((it) => {
      seq += 1
      const is_partial = it.is_available === false && (it.available_quantity ?? 0) > 0
      return {
        key: `e${seq}`,
        id: it.id,
        is_generic: it.is_generic,
        species_id: it.species_id ?? '',
        species_label: it.species_name ?? '',
        container_id: it.container_id,
        quantity: String(it.quantity),
        is_available: it.is_available,
        is_partial,
        partial_note: buildAvailabilityNote({
          requestedQuantity: it.quantity,
          requestedContainerName: it.container_name,
          isAvailable: it.is_available,
          availableQuantity: it.available_quantity,
          availableContainerName: it.available_container_name,
        }),
        notes: it.availability_notes,
      }
    }),
  )

  const speciesItems: AutocompleteItem[] = speciesList.map((s) => ({
    id: s.id,
    label: s.common_name,
    tags: s.tags ?? undefined,
  }))

  function showToast(message: string, type: ToastType) {
    setToast({ message, type })
  }

  // Cadastro rapido de especie a partir da busca: cria, anexa e seleciona na linha.
  async function handleQuickCreateSpecies(key: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const result = await createSpeciesQuick(trimmed)
    if (result.error || !result.id) {
      showToast(result.error ?? 'Erro ao criar espécie.', 'error')
      return
    }
    const created: Species = { id: result.id, common_name: trimmed, tags: [] }
    setSpeciesList((list) => [...list, created])
    updateRow(key, { species_id: created.id, species_label: created.common_name })
    showToast(`Espécie "${trimmed}" criada!`, 'success')
  }
  function updateRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }
  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key))
  }
  function addRow() {
    const last = rows[rows.length - 1]
    const row = newRow(
      last ? { container_id: last.container_id, quantity: last.quantity } : undefined,
    )
    setRows((rs) => [...rs, row])
    setFocusKey(row.key)
  }
  function toggleGeneric(key: string) {
    setRows((rs) =>
      rs.map((r) =>
        r.key === key ? { ...r, is_generic: !r.is_generic, species_id: '', species_label: '' } : r,
      ),
    )
  }

  function validate(): string | null {
    if (rows.length === 0) return 'O pedido precisa de pelo menos um item.'
    for (const r of rows) {
      if (!r.container_id) return 'Selecione o recipiente de todos os itens.'
      if (!r.quantity || Number(r.quantity) <= 0) return 'Informe quantidade válida.'
      if (!r.is_generic && !r.species_id) return 'Selecione a espécie dos itens específicos.'
    }
    return null
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const error = validate()
    if (error) {
      showToast(error, 'error')
      return
    }
    const payload: ReviewItemInput[] = rows.map((r) => ({
      id: r.id,
      is_generic: r.is_generic,
      species_id: r.is_generic ? null : r.species_id,
      container_id: r.container_id,
      quantity: Number(r.quantity),
    }))
    startTransition(async () => {
      const result = await updateOrderAfterReview(orderId, payload)
      if (result.error) {
        showToast(`Erro: ${result.error}`, 'error')
        return
      }
      showToast('Pedido alterado — enviado para re-verificação', 'success')
      router.push(`/pedidos/${orderId}`)
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-4">
        <Link href={`/pedidos/${orderId}`} className="text-sm text-green-300 hover:text-white mb-1 inline-block">
          ← Pedido #{orderNumber}
        </Link>
        <h1 className="text-xl font-bold">Editar itens</h1>
      </header>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-4 space-y-3">
        <p className="text-sm text-gray-500">
          Itens indisponíveis aparecem em vermelho com a observação da gerência. Ao salvar, o pedido
          volta para re-verificação.
        </p>

        {orderNotes && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            <span className="font-semibold">Observações do pedido:</span> {orderNotes}
          </div>
        )}

        {rows.map((r) => {
          const indisponivel = r.is_available === false && !r.is_partial
          return (
            <div
              key={r.key}
              className={`rounded-xl border-2 p-3 space-y-3 ${
                indisponivel
                  ? 'border-red-300 bg-red-50'
                  : r.is_partial
                    ? 'border-amber-300 bg-amber-50'
                    : r.is_generic
                      ? 'border-blue-200 bg-blue-50/50'
                      : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toggleGeneric(r.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    r.is_generic ? 'bg-blue-600 text-white' : 'bg-green-100 text-green-800'
                  }`}
                >
                  {r.is_generic ? 'GENÉRICO' : 'ESPECÍFICO'}
                </button>
                <button
                  type="button"
                  onClick={() => removeRow(r.key)}
                  className="text-red-600 font-bold text-sm px-2"
                >
                  Remover
                </button>
              </div>

              {indisponivel && (
                <p className="text-xs font-semibold text-red-600">
                  Indisponível{r.notes ? `: ${r.notes}` : ''}
                </p>
              )}
              {r.is_partial && (
                <p className="text-xs font-semibold text-amber-700">
                  {r.partial_note ?? 'Parcial'}{r.notes ? ` · ${r.notes}` : ''}
                </p>
              )}
              {/* Observacao da gerencia sempre visivel (mesmo quando o item esta
                  disponivel) — guia o ajuste, ex: "so temos balde". */}
              {r.notes && !indisponivel && !r.is_partial && (
                <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                  📝 Gerência: {r.notes}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  {r.is_generic ? (
                    <div className="input bg-gray-100 text-gray-500 flex items-center">
                      Gerência escolhe a espécie
                    </div>
                  ) : (
                    <Autocomplete
                      items={speciesItems}
                      placeholder="Buscar espécie…"
                      initialValue={r.species_label}
                      autoFocus={r.key === focusKey}
                      allowCreate
                      onSelect={(it) => updateRow(r.key, { species_id: it.id, species_label: it.label })}
                      onCreateNew={(q) => handleQuickCreateSpecies(r.key, q)}
                    />
                  )}
                </div>
                <div className="sm:col-span-4">
                  <select
                    value={r.container_id}
                    onChange={(e) => updateRow(r.key, { container_id: e.target.value })}
                    className="input"
                  >
                    <option value="">{r.is_generic ? 'Recipiente mínimo…' : 'Recipiente…'}</option>
                    {containers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={r.quantity}
                    onChange={(e) => updateRow(r.key, { quantity: e.target.value })}
                    placeholder="Qtd"
                    className="input"
                  />
                </div>
              </div>
            </div>
          )
        })}

        <button
          type="button"
          onClick={addRow}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm font-semibold text-gray-500 hover:border-green-500 hover:text-green-700"
        >
          + Adicionar item
        </button>

        <div className="flex gap-3 pt-2 pb-10">
          <Link href={`/pedidos/${orderId}`} className="btn-secondary text-center">
            Cancelar
          </Link>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? 'Salvando…' : 'Salvar e re-verificar'}
          </button>
        </div>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
