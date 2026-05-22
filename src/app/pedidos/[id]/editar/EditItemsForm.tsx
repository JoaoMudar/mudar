'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import Autocomplete, { AutocompleteItem } from '@/components/Autocomplete'
import { updateOrderAfterReview } from '../../actions'
import type { ReviewItemInput } from '@/lib/orders'

interface Species {
  id: string
  common_name: string
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
  quantity: number
  is_generic: boolean
  is_available: boolean | null
  availability_notes: string | null
}

interface Props {
  orderId: string
  orderNumber: number
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
  notes: string | null
}

interface ToastState {
  message: string
  type: ToastType
}

let seq = 0
function newRow(): Row {
  seq += 1
  return {
    key: `e${seq}`,
    is_generic: false,
    species_id: '',
    species_label: '',
    container_id: '',
    quantity: '',
    is_available: null,
    notes: null,
  }
}

export default function EditItemsForm({
  orderId,
  orderNumber,
  items,
  species,
  containers,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<ToastState | null>(null)
  const [rows, setRows] = useState<Row[]>(() =>
    items.map((it) => {
      seq += 1
      return {
        key: `e${seq}`,
        id: it.id,
        is_generic: it.is_generic,
        species_id: it.species_id ?? '',
        species_label: it.species_name ?? '',
        container_id: it.container_id,
        quantity: String(it.quantity),
        is_available: it.is_available,
        notes: it.availability_notes,
      }
    }),
  )

  const speciesItems: AutocompleteItem[] = species.map((s) => ({ id: s.id, label: s.common_name }))

  function showToast(message: string, type: ToastType) {
    setToast({ message, type })
  }
  function updateRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }
  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key))
  }
  function addRow() {
    setRows((rs) => [...rs, newRow()])
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

        {rows.map((r) => {
          const indisponivel = r.is_available === false
          return (
            <div
              key={r.key}
              className={`rounded-xl border-2 p-3 space-y-3 ${
                indisponivel
                  ? 'border-red-300 bg-red-50'
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
                      onSelect={(it) => updateRow(r.key, { species_id: it.id, species_label: it.label })}
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
