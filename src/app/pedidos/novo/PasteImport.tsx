'use client'

import { useState } from 'react'
import Autocomplete, { AutocompleteItem } from '@/components/Autocomplete'
import { buildPasteRows, type MatchStatus, type SpeciesOption } from '@/lib/order-paste'
import { normalizePopularName } from '@/lib/species-names'
import { createSpeciesQuick, addPopularName } from '@/app/cadastros/especies/actions'

interface Container {
  id: string
  name: string
  volume_liters: number | null
}

/** Item pronto para entrar no pedido (mesma forma que o OrderForm usa internamente). */
export interface ImportedItem {
  is_generic: boolean
  species_id: string
  species_label: string
  container_id: string
  quantity: string
}

interface Props {
  species: SpeciesOption[]
  containers: Container[]
  onImport: (items: ImportedItem[]) => void
  onClose: () => void
}

interface ReviewRow {
  key: string
  raw: string
  /** Nome da especie como veio na linha colada (para oferecer salvar como sinonimo). */
  pasted_name: string
  status: MatchStatus
  /** Nome (sinonimo/cientifico) pelo qual a linha foi reconhecida, se nao o principal. */
  matched_via: string | null
  /** true quando o usuario escolheu a especie manualmente no autocomplete. */
  resolved_manually: boolean
  /** true depois que o nome colado foi salvo como sinonimo da especie. */
  name_saved: boolean
  is_generic: boolean
  species_id: string
  species_label: string
  container_id: string
  quantity: string
}

let pasteSeq = 0

const STATUS_META: Record<MatchStatus, { chip: string; label: string }> = {
  exact: { chip: 'bg-green-100 text-green-800', label: '✓ exata' },
  likely: { chip: 'bg-amber-100 text-amber-800', label: '⚠ provável' },
  none: { chip: 'bg-red-100 text-red-800', label: '✗ resolver' },
}

export default function PasteImport({ species, containers, onImport, onClose }: Props) {
  const [text, setText] = useState('')
  const [defaultContainerId, setDefaultContainerId] = useState('')
  // Especies locais = cadastro + as criadas na hora, para o autocomplete enxergar.
  const [localSpecies, setLocalSpecies] = useState<SpeciesOption[]>(species)
  const [rows, setRows] = useState<ReviewRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creatingKey, setCreatingKey] = useState<string | null>(null)
  const [savingNameKey, setSavingNameKey] = useState<string | null>(null)

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
    if (!sp) return true // especie fora da lista local: nao oferece salvar
    const target = normalizePopularName(name)
    if (!target) return true
    return [
      sp.common_name,
      ...(sp.popular_names ?? []),
      ...(sp.scientific_name ? [sp.scientific_name] : []),
    ].some((n) => normalizePopularName(n) === target)
  }

  function handleRecognize() {
    if (!defaultContainerId) {
      setError('Escolha o recipiente padrão antes de reconhecer.')
      return
    }
    const parsed = buildPasteRows(text, localSpecies)
    if (parsed.length === 0) {
      setError('Nada reconhecido. Cole uma linha por espécie, ex: "Ipê amarelo 500".')
      return
    }
    setError(null)
    setRows(
      parsed.map((r) => {
        pasteSeq += 1
        return {
          key: `p${pasteSeq}`,
          raw: r.raw,
          pasted_name: r.name,
          status: r.match.status,
          matched_via: r.match.matchedVia ?? null,
          resolved_manually: false,
          name_saved: false,
          is_generic: false,
          species_id: r.match.speciesId ?? '',
          species_label: r.match.speciesName ?? '',
          container_id: defaultContainerId,
          quantity: r.quantity !== null ? String(r.quantity) : '',
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
  function toggleGeneric(key: string) {
    setRows(
      (rs) =>
        rs &&
        rs.map((r) =>
          r.key === key
            ? {
                ...r,
                is_generic: !r.is_generic,
                species_id: '',
                species_label: '',
                status: !r.is_generic ? 'exact' : r.status,
              }
            : r,
        ),
    )
  }

  // Trocar o recipiente padrao aplica a todas as linhas (raramente diferem).
  function changeDefaultContainer(id: string) {
    setDefaultContainerId(id)
    setRows((rs) => rs && rs.map((r) => ({ ...r, container_id: id })))
  }

  async function handleCreateSpecies(key: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    setCreatingKey(key)
    const result = await createSpeciesQuick(trimmed)
    setCreatingKey(null)
    // Nome ja cadastrado (principal ou sinonimo): usa a especie existente.
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
    patchRow(key, {
      species_id: result.id,
      species_label: trimmed,
      status: 'exact',
    })
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
    // Atualiza a lista local: o proximo "colar" ja reconhece este nome.
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
  const unresolved = list.filter(
    (r) => !(r.container_id && Number(r.quantity) > 0 && (r.is_generic || r.species_id)),
  ).length
  const canImport = list.length > 0 && unresolved === 0

  function handleConfirm() {
    if (!canImport) return
    onImport(
      list.map((r) => ({
        is_generic: r.is_generic,
        species_id: r.is_generic ? '' : r.species_id,
        species_label: r.is_generic ? '' : r.species_label,
        container_id: r.container_id,
        quantity: r.quantity,
      })),
    )
  }

  return (
    <div className="rounded-xl border-2 border-green-300 bg-green-50/40 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-green-900">Colar lista do WhatsApp</h3>
        <button type="button" onClick={onClose} className="text-sm font-semibold text-gray-500">
          Fechar
        </button>
      </div>

      {/* Recipiente padrao + textarea + reconhecer */}
      {rows === null ? (
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="paste-container">Recipiente padrão (vale para todas)</label>
            <select
              id="paste-container"
              value={defaultContainerId}
              onChange={(e) => setDefaultContainerId(e.target.value)}
              className="input"
            >
              <option value="">Selecione…</option>
              {containers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Cole aqui, uma espécie por linha. Ex:\nIpê amarelo 500\n200 araucária\npitanga - 100'}
            className="input resize-none font-mono text-sm"
          />
          <button type="button" onClick={handleRecognize} className="btn-primary">
            Reconhecer →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Recipiente padrao continua editavel na revisao */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-600" htmlFor="paste-container-2">
              Recipiente padrão:
            </label>
            <select
              id="paste-container-2"
              value={defaultContainerId}
              onChange={(e) => changeDefaultContainer(e.target.value)}
              className="input max-w-[12rem] py-2"
            >
              {containers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            {list.map((r) => (
              <div
                key={r.key}
                className={`rounded-lg border-2 p-3 space-y-2 ${
                  r.is_generic
                    ? 'border-blue-200 bg-blue-50/50'
                    : r.species_id
                      ? 'border-gray-200 bg-white'
                      : 'border-red-200 bg-red-50/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400 truncate" title={r.raw}>{r.raw}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {!r.is_generic && (() => {
                      // Sem especie selecionada exibe sempre 'resolver', mesmo que
                      // o casamento original tenha sido exato (ex: virou e voltou de generico).
                      const disp = r.species_id ? r.status : 'none'
                      return (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_META[disp].chip}`}>
                          {STATUS_META[disp].label}
                        </span>
                      )
                    })()}
                    <button
                      type="button"
                      onClick={() => toggleGeneric(r.key)}
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        r.is_generic ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                      title="Genérico: gerência escolhe a espécie depois"
                    >
                      {r.is_generic ? 'GENÉRICO' : 'tornar genérico'}
                    </button>
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
                  <div className="sm:col-span-8">
                    {r.is_generic ? (
                      <div className="input bg-gray-100 text-gray-500 flex items-center py-2">
                        Gerência escolhe a espécie
                      </div>
                    ) : (
                      <>
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
                        {/* Nome novo: oferece guardar como sinonimo para reconhecer da proxima vez */}
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
                      </>
                    )}
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={r.quantity}
                      onChange={(e) => patchRow(r.key, { quantity: e.target.value })}
                      placeholder="Qtd"
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
                ? `${unresolved} linha(s) a resolver (espécie ou quantidade)`
                : `${list.length} item(ns) prontos`}
            </span>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canImport}
              className="btn-primary disabled:opacity-50"
            >
              Adicionar {list.length} ao pedido
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  )
}
