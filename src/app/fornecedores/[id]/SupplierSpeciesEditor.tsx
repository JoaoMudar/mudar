'use client'

import { useState, useTransition } from 'react'
import Autocomplete, { AutocompleteItem } from '@/components/Autocomplete'
import { createSpeciesQuick } from '@/app/admin/especies/actions'
import {
  AVAILABILITY_META,
  type SupplierAvailability,
  type SupplierSpeciesInput,
} from '@/lib/suppliers'
import { addSupplierSpecies, updateSupplierSpecies } from '../actions'

export interface SupplierSpeciesRow {
  id: string
  species_id: string
  common_name: string
  scientific_name: string | null
  size: string | null
  container: string | null
  unit_price: string | number | null
  min_quantity: number | null
  availability: SupplierAvailability
  notes: string | null
}

interface Props {
  supplierId: string
  /** Linha existente = modo edicao; ausente = modo adicionar. */
  row?: SupplierSpeciesRow
  speciesItems: AutocompleteItem[]
  onSaved: () => void
  onCancel: () => void
}

/**
 * Form de uma especie do fornecedor (adicionar ou editar). So a especie e
 * obrigatoria — preco/tamanho/recipiente sao anotados quando se souber.
 */
export default function SupplierSpeciesEditor({
  supplierId,
  row,
  speciesItems,
  onSaved,
  onCancel,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [speciesId, setSpeciesId] = useState(row?.species_id ?? '')
  const [speciesLabel, setSpeciesLabel] = useState(row?.common_name ?? '')
  const [size, setSize] = useState(row?.size ?? '')
  const [container, setContainer] = useState(row?.container ?? '')
  const [price, setPrice] = useState(row?.unit_price != null ? String(row.unit_price) : '')
  const [minQty, setMinQty] = useState(row?.min_quantity != null ? String(row.min_quantity) : '')
  const [availability, setAvailability] = useState<SupplierAvailability>(
    row?.availability ?? 'unknown',
  )
  const [notes, setNotes] = useState(row?.notes ?? '')

  // Especie fora do catalogo: cadastro rapido na hora (mesmo fluxo do PasteImport).
  async function handleCreateSpecies(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    setCreating(true)
    const result = await createSpeciesQuick(trimmed)
    setCreating(false)
    if (result.existing) {
      setSpeciesId(result.existing.id)
      setSpeciesLabel(result.existing.common_name)
      setError(null)
      return
    }
    if (result.error || !result.id) {
      setError(result.error ?? 'Erro ao criar espécie.')
      return
    }
    setSpeciesId(result.id)
    setSpeciesLabel(trimmed)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const priceNum = price.trim() === '' ? null : Number(price.replace(',', '.'))
    if (priceNum !== null && !Number.isFinite(priceNum)) {
      setError('Preço inválido.')
      return
    }
    const data: SupplierSpeciesInput = {
      species_id: speciesId,
      size,
      container,
      unit_price: priceNum,
      min_quantity: minQty.trim() === '' ? null : Number(minQty),
      availability,
      notes,
    }
    startTransition(async () => {
      const result = row
        ? await updateSupplierSpecies(row.id, data)
        : await addSupplierSpecies(supplierId, data)
      if (result.error) {
        setError(result.error)
        return
      }
      onSaved()
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border-2 border-green-200 bg-green-50/40 p-3 space-y-3"
    >
      <div>
        <label className="label">Espécie *</label>
        <Autocomplete
          items={speciesItems}
          placeholder={creating ? 'Criando…' : 'Buscar espécie…'}
          initialValue={speciesLabel}
          allowCreate
          onSelect={(item) => {
            setSpeciesId(item.id)
            setSpeciesLabel(item.label)
          }}
          onCreateNew={handleCreateSpecies}
          autoFocus={!row}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label className="label" htmlFor={`ss-size-${row?.id ?? 'new'}`}>Tamanho</label>
          <input
            id={`ss-size-${row?.id ?? 'new'}`}
            type="text"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="30-50cm"
            className="input py-2"
          />
        </div>
        <div>
          <label className="label" htmlFor={`ss-container-${row?.id ?? 'new'}`}>Embalagem</label>
          <input
            id={`ss-container-${row?.id ?? 'new'}`}
            type="text"
            value={container}
            onChange={(e) => setContainer(e.target.value)}
            placeholder="saquinho"
            className="input py-2"
          />
        </div>
        <div>
          <label className="label" htmlFor={`ss-price-${row?.id ?? 'new'}`}>Preço (R$)</label>
          <input
            id={`ss-price-${row?.id ?? 'new'}`}
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="4,50"
            className="input py-2"
          />
        </div>
        <div>
          <label className="label" htmlFor={`ss-minqty-${row?.id ?? 'new'}`}>Qtd. mínima</label>
          <input
            id={`ss-minqty-${row?.id ?? 'new'}`}
            type="number"
            inputMode="numeric"
            min="1"
            value={minQty}
            onChange={(e) => setMinQty(e.target.value)}
            className="input py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor={`ss-avail-${row?.id ?? 'new'}`}>Disponibilidade</label>
          <select
            id={`ss-avail-${row?.id ?? 'new'}`}
            value={availability}
            onChange={(e) => setAvailability(e.target.value as SupplierAvailability)}
            className="input py-2"
          >
            {(Object.keys(AVAILABILITY_META) as SupplierAvailability[]).map((a) => (
              <option key={a} value={a}>{AVAILABILITY_META[a].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`ss-notes-${row?.id ?? 'new'}`}>Observações</label>
          <input
            id={`ss-notes-${row?.id ?? 'new'}`}
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input py-2"
          />
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || !speciesId}
          className="btn-primary flex-1 disabled:opacity-50"
        >
          {isPending ? 'Salvando…' : row ? 'Salvar' : 'Adicionar espécie'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl font-semibold text-gray-600 bg-gray-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
