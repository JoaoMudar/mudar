'use client'

import { useState } from 'react'
import Autocomplete, { AutocompleteItem } from '@/components/Autocomplete'
import { buildSupplierPasteRows } from '@/lib/supplier-paste'
import { type MatchStatus, type SpeciesOption } from '@/lib/order-paste'
import { normalizePopularName } from '@/lib/species-names'
import { createSpeciesQuick, addPopularName } from '@/app/cadastros/especies/actions'
import { importSupplierSpeciesRows } from '../actions'

interface Props {
  supplierId: string
  species: SpeciesOption[]
  onImported: (count: number) => void
  onClose: () => void
}

interface ReviewRow {
  key: string
  raw: string
  /** Nome como veio na linha colada (para oferecer salvar como sinonimo). */
  pasted_name: string
  status: MatchStatus
  matched_via: string | null
  resolved_manually: boolean
  name_saved: boolean
  species_id: string
  species_label: string
  price: string
  size: string
}

let pasteSeq = 0

const STATUS_META: Record<MatchStatus, { chip: string; label: string }> = {
  exact: { chip: 'bg-green-100 text-green-800', label: '✓ exata' },
  likely: { chip: 'bg-amber-100 text-amber-800', label: '⚠ provável' },
  none: { chip: 'bg-red-100 text-red-800', label: '✗ resolver' },
}

/**
 * Colagem da lista de especies de um FORNECEDOR (adaptacao do PasteImport de
 * pedidos): alem do nome, extrai preco e tamanho de cada linha. Revisao
 * assistida com criacao rapida de especie e gravacao de sinonimos — cada lista
 * colada enriquece o catalogo para a proxima.
 */
export default function SpeciesPasteImport({ supplierId, species, onImported, onClose }: Props) {
  const [text, setText] = useState('')
  const [localSpecies, setLocalSpecies] = useState<SpeciesOption[]>(species)
  const [rows, setRows] = useState<ReviewRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creatingKey, setCreatingKey] = useState<string | null>(null)
  const [savingNameKey, setSavingNameKey] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const speciesItems: AutocompleteItem[] = localSpecies.map((s) => ({
    id: s.id,
    label: s.common_name,
    keywords: [
      ...(s.popular_names ?? []),
      ...(s.scientific_name ? [s.scientific_name] : []),
    ],
  }))

  /** true se a especie ja conhece este nome (principal, sinonimo ou cientifico). */
  function speciesHasName(speciesId: string, name: string): boolean {
    const sp = localSpecies.find((s) => s.id === speciesId)
    if (!sp) return true
    const target = normalizePopularName(name)
    if (!target) return true
    return [
      sp.common_name,
      ...(sp.popular_names ?? []),
      ...(sp.scientific_name ? [sp.scientific_name] : []),
    ].some((n) => normalizePopularName(n) === target)
  }

  function handleRecognize() {
    const parsed = buildSupplierPasteRows(text, localSpecies)
    if (parsed.length === 0) {
      setError('Nada reconhecido. Cole uma linha por espécie, ex: "Ipê amarelo 30cm R$ 4,50".')
      return
    }
    setError(null)
    setRows(
      parsed.map((r) => {
        pasteSeq += 1
        return {
          key: `sp${pasteSeq}`,
          raw: r.raw,
          pasted_name: r.name,
          status: r.match.status,
          matched_via: r.match.matchedVia ?? null,
          resolved_manually: false,
          name_saved: false,
          species_id: r.match.speciesId ?? '',
          species_label: r.match.speciesName ?? '',
          price: r.price !== null ? String(r.price).replace('.', ',') : '',
          size: r.size ?? '',
        }
      }),
    )
  }

  function patchRow(key: string, patch: Partial<ReviewRow>) {
    setRows((rs) => rs && rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }
  function removeRow(key: string) {
    setRows((rs) => rs && rs.filter((r) => r.key !== key))
  }

  async function handleCreateSpecies(key: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    setCreatingKey(key)
    const result = await createSpeciesQuick(trimmed)
    setCreatingKey(null)
    if (result.existing) {
      patchRow(key, {
        species_id: result.existing.id,
        species_label: result.existing.common_name,
        status: 'exact',
        resolved_manually: true,
      })
      setError(null)
      return
    }
    if (result.error || !result.id) {
      setError(result.error ?? 'Erro ao criar espécie.')
      return
    }
    setLocalSpecies((sp) => [...sp, { id: result.id!, common_name: trimmed }])
    patchRow(key, { species_id: result.id, species_label: trimmed, status: 'exact' })
  }

  /** Salva o nome colado como sinonimo da especie escolhida manualmente. */
  async function handleSavePastedName(row: ReviewRow) {
    if (savingNameKey) return
    setSavingNameKey(row.key)
    const result = await addPopularName(row.species_id, row.pasted_name)
    setSavingNameKey(null)
    if (result.error) {
      setError(result.error)
      return
    }
    setError(null)
    setLocalSpecies((sp) =>
      sp.map((s) =>
        s.id === row.species_id
          ? { ...s, popular_names: [...(s.popular_names ?? []), row.pasted_name] }
          : s,
      ),
    )
    patchRow(row.key, { name_saved: true })
  }

  const list = rows ?? []
  const unresolved = list.filter((r) => !r.species_id).length
  const canImport = list.length > 0 && unresolved === 0 && !importing

  async function handleConfirm() {
    if (!canImport) return
    setImporting(true)
    const result = await importSupplierSpeciesRows(
      supplierId,
      list.map((r) => ({
        species_id: r.species_id,
        size: r.size,
        unit_price: r.price.trim() === '' ? null : Number(r.price.replace(',', '.')),
      })),
    )
    setImporting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onImported(result.inserted ?? list.length)
  }

  return (
    <div className="rounded-xl border-2 border-green-300 bg-green-50/40 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-green-900">Colar lista do fornecedor</h3>
        <button type="button" onClick={onClose} className="text-sm font-semibold text-gray-500">
          Fechar
        </button>
      </div>

      {rows === null ? (
        <div className="space-y-3">
          <textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Cole aqui, uma espécie por linha. Ex:\nIpê amarelo 30cm R$ 4,50\nAraucária 1m - 12,00\npitanga'}
            className="input resize-none font-mono text-sm"
          />
          <button type="button" onClick={handleRecognize} className="btn-primary">
            Reconhecer →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            {list.map((r) => (
              <div
                key={r.key}
                className={`rounded-lg border-2 p-3 space-y-2 ${
                  r.species_id ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400 truncate" title={r.raw}>{r.raw}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {(() => {
                      const disp = r.species_id ? r.status : 'none'
                      return (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_META[disp].chip}`}>
                          {STATUS_META[disp].label}
                        </span>
                      )
                    })()}
                    <button
                      type="button"
                      onClick={() => removeRow(r.key)}
                      className="text-red-600 font-bold text-sm px-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <Autocomplete
                      items={speciesItems}
                      placeholder={creatingKey === r.key ? 'Criando…' : 'Buscar espécie…'}
                      initialValue={r.species_label}
                      allowCreate
                      onSelect={(item) =>
                        patchRow(r.key, {
                          species_id: item.id,
                          species_label: item.label,
                          status: 'exact',
                          matched_via: null,
                          resolved_manually: true,
                        })
                      }
                      onCreateNew={(q) => handleCreateSpecies(r.key, q)}
                    />
                    {r.species_id && r.matched_via && (
                      <p className="mt-1 text-xs text-gray-400">
                        reconhecido por “{r.matched_via}”
                      </p>
                    )}
                    {r.species_id &&
                      r.resolved_manually &&
                      !r.name_saved &&
                      !speciesHasName(r.species_id, r.pasted_name) && (
                        <button
                          type="button"
                          onClick={() => handleSavePastedName(r)}
                          disabled={savingNameKey === r.key}
                          className="mt-1 text-xs font-semibold text-green-700 disabled:opacity-50"
                        >
                          {savingNameKey === r.key
                            ? 'Salvando…'
                            : `+ Salvar “${r.pasted_name}” como outro nome de ${r.species_label}`}
                        </button>
                      )}
                    {r.name_saved && (
                      <p className="mt-1 text-xs font-semibold text-green-700">
                        ✓ “{r.pasted_name}” salvo como outro nome
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={r.size}
                      onChange={(e) => patchRow(r.key, { size: e.target.value })}
                      placeholder="Tamanho"
                      className="input py-2"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={r.price}
                      onChange={(e) => patchRow(r.key, { price: e.target.value })}
                      placeholder="Preço R$"
                      className="input py-2"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-sm text-gray-500">
              {unresolved > 0
                ? `${unresolved} linha(s) sem espécie`
                : `${list.length} espécie(s) prontas`}
            </span>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canImport}
              className="btn-primary disabled:opacity-50"
            >
              {importing ? 'Importando…' : `Adicionar ${list.length} ao fornecedor`}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  )
}
