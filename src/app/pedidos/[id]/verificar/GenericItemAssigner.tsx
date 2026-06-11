'use client'

import { useState, useTransition } from 'react'
import Autocomplete, { AutocompleteItem } from '@/components/Autocomplete'
import { ToastType } from '@/components/Toast'
import {
  sumQuantities,
  validateGenericAssignment,
  describeContainerChange,
  type SpeciesAssignment,
} from '@/lib/orders'
import { assignSpeciesToGenericItem } from '../../actions'

interface Species {
  id: string
  common_name: string
  scientific_name?: string | null
  /** Sinonimos — a busca tambem encontra a especie por eles. */
  popular_names?: string[]
}
interface Container {
  id: string
  name: string
  volume_liters: number | null
}
interface Child {
  id: string
  species_id: string | null
  species_name: string | null
  container_id: string
  quantity: number
}
export interface GenericItem {
  id: string
  quantity: number
  container_id: string
  container_name: string
  container_volume: number | null
  is_available: boolean | null
  children: Child[]
}

interface Props {
  item: GenericItem
  species: Species[]
  containers: Container[]
  onSaved: () => void
  showToast: (message: string, type: ToastType) => void
}

interface Row {
  key: string
  species_id: string
  species_label: string
  container_id: string
  quantity: string
}

let seq = 0
function rowKey() {
  seq += 1
  return `g${seq}`
}

export default function GenericItemAssigner({
  item,
  species,
  containers,
  onSaved,
  showToast,
}: Props) {
  // O recipiente do pedido eh apenas um MINIMO de referencia. A gerencia pode
  // escolher qualquer recipiente (maior OU menor); a troca eh destacada, nao bloqueada.
  const containerNameById: Record<string, string> = {}
  for (const c of containers) containerNameById[c.id] = c.name

  const [rows, setRows] = useState<Row[]>(() =>
    item.children.length > 0
      ? item.children.map((c) => ({
          key: rowKey(),
          species_id: c.species_id ?? '',
          species_label: c.species_name ?? '',
          container_id: c.container_id,
          quantity: String(c.quantity),
        }))
      : [],
  )
  const [saved, setSaved] = useState(item.is_available === true)
  const [isPending, startTransition] = useTransition()

  const speciesItems: AutocompleteItem[] = species.map((s) => ({
    id: s.id,
    label: s.common_name,
    keywords: [
      ...(s.popular_names ?? []),
      ...(s.scientific_name ? [s.scientific_name] : []),
    ],
  }))

  const assigned = sumQuantities(rows.map((r) => ({ quantity: Number(r.quantity) || 0 })))
  const remaining = item.quantity - assigned

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
    setSaved(false)
  }
  function addRow() {
    setRows((rs) => [
      ...rs,
      { key: rowKey(), species_id: '', species_label: '', container_id: item.container_id, quantity: '' },
    ])
    setSaved(false)
  }
  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key))
    setSaved(false)
  }

  function handleSave() {
    const assignments: SpeciesAssignment[] = rows.map((r) => ({
      species_id: r.species_id,
      container_id: r.container_id,
      quantity: Number(r.quantity),
    }))
    const err = validateGenericAssignment(item.quantity, assignments)
    if (err) {
      showToast(err, 'error')
      return
    }
    startTransition(async () => {
      const result = await assignSpeciesToGenericItem(item.id, assignments)
      if (result.error) {
        showToast(`Erro: ${result.error}`, 'error')
        return
      }
      setSaved(true)
      showToast('Composição definida!', 'success')
      onSaved()
    })
  }

  return (
    <div
      className={`rounded-xl border-2 p-4 space-y-3 ${
        saved ? 'border-green-400 bg-green-50' : 'border-blue-300 bg-blue-50/60'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold bg-blue-600 text-white px-2 py-1 rounded-full">
          GENÉRICO
        </span>
        {saved && <span className="text-green-700 font-bold text-sm">✓ definido</span>}
      </div>
      <p className="text-sm text-gray-700">
        Mín: <span className="font-semibold">{item.container_name}</span> — total{' '}
        <span className="font-semibold">{item.quantity} un</span>
      </p>

      {/* Status do restante */}
      <p
        className={`text-sm font-bold ${
          remaining === 0 ? 'text-green-700' : remaining < 0 ? 'text-red-600' : 'text-orange-600'
        }`}
      >
        {remaining === 0
          ? 'Completo!'
          : remaining < 0
            ? `Excedeu ${Math.abs(remaining)} un`
            : `Restante: ${remaining} un`}
      </p>

      {/* Linhas de especies atribuidas */}
      <div className="space-y-2">
        {rows.map((r) => {
          const change = describeContainerChange(
            containerNameById[r.container_id] ?? null,
            item.container_name,
          )
          return (
            <div key={r.key} className="space-y-1">
              <div className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-6">
                  <Autocomplete
                    items={speciesItems}
                    placeholder="Espécie…"
                    initialValue={r.species_label}
                    onSelect={(it) => updateRow(r.key, { species_id: it.id, species_label: it.label })}
                  />
                </div>
                <div className="col-span-3">
                  <select
                    value={r.container_id}
                    onChange={(e) => updateRow(r.key, { container_id: e.target.value })}
                    className="input px-2 py-3"
                  >
                    <option value="">Recip.…</option>
                    {containers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={r.quantity}
                    onChange={(e) => updateRow(r.key, { quantity: e.target.value })}
                    placeholder="Qtd"
                    className="input px-2 py-3"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => removeRow(r.key)}
                    className="text-red-600 font-bold text-lg leading-none mt-3"
                    aria-label="Remover espécie"
                  >
                    ×
                  </button>
                </div>
              </div>
              {change && (
                <p className="text-xs font-bold text-amber-700 pl-1">⇄ recipiente: {change}</p>
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="w-full border-2 border-dashed border-blue-300 rounded-xl py-2 text-sm font-semibold text-blue-700"
      >
        + Adicionar espécie
      </button>

      {remaining === 0 && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="w-full bg-green-700 text-white font-bold py-3 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
        >
          {isPending ? 'Salvando…' : saved ? 'Atualizar composição' : 'Composição definida'}
        </button>
      )}
    </div>
  )
}
