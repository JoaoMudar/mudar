'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import { AutocompleteItem } from '@/components/Autocomplete'
import { type SpeciesOption } from '@/lib/order-paste'
import {
  AVAILABILITY_META,
  SUPPLIER_STATUS_META,
  formatPriceBR,
  type SupplierStatus,
} from '@/lib/suppliers'
import SupplierForm, { type SupplierRecord } from '../SupplierForm'
import { removeSupplierSpecies, toggleSupplierActive } from '../actions'
import SupplierSpeciesEditor, { type SupplierSpeciesRow } from './SupplierSpeciesEditor'
import SpeciesPasteImport from './SpeciesPasteImport'

interface SupplierWithSpecies extends SupplierRecord {
  active: boolean
  species: SupplierSpeciesRow[]
}

interface ToastState {
  message: string
  type: ToastType
}

export default function SupplierDetail({
  supplier,
  allSpecies,
}: {
  supplier: SupplierWithSpecies
  allSpecies: SpeciesOption[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [addingSpecies, setAddingSpecies] = useState(false)
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [showPaste, setShowPaste] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const meta = SUPPLIER_STATUS_META[supplier.status as SupplierStatus]
  const speciesItems: AutocompleteItem[] = allSpecies.map((s) => ({
    id: s.id,
    label: s.common_name,
    keywords: [
      ...(s.popular_names ?? []),
      ...(s.scientific_name ? [s.scientific_name] : []),
    ],
  }))

  function showToast(message: string, type: ToastType) {
    setToast({ message, type })
  }

  function handleRemoveSpecies(row: SupplierSpeciesRow) {
    if (!window.confirm(`Remover "${row.common_name}" deste fornecedor?`)) return
    startTransition(async () => {
      const result = await removeSupplierSpecies(row.id)
      if (result.error) {
        showToast(`Erro: ${result.error}`, 'error')
        return
      }
      showToast('Espécie removida.', 'success')
      router.refresh()
    })
  }

  function handleArchive() {
    if (!window.confirm(`Arquivar "${supplier.name}"? Ele some da lista de fornecedores.`))
      return
    startTransition(async () => {
      const result = await toggleSupplierActive(supplier.id, false)
      if (result.error) {
        showToast(`Erro: ${result.error}`, 'error')
        return
      }
      router.push('/fornecedores')
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-4">
        <Link
          href="/fornecedores"
          className="text-sm text-green-300 hover:text-white mb-1 inline-block"
        >
          ← Fornecedores
        </Link>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold truncate">{supplier.name}</h1>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${meta.badge}`}>
            {meta.label}
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* ─── Contato ─────────────────────────────────────── */}
        {editing ? (
          <SupplierForm
            supplier={supplier}
            onCancel={() => setEditing(false)}
            onSaved={() => {
              setEditing(false)
              showToast('Fornecedor atualizado!', 'success')
              router.refresh()
            }}
          />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 text-sm text-gray-600 min-w-0">
                {supplier.contact_name && <p>👤 {supplier.contact_name}</p>}
                {supplier.whatsapp && <p>📱 {supplier.whatsapp}</p>}
                {supplier.phone && <p>☎️ {supplier.phone}</p>}
                {supplier.email && <p className="truncate">✉️ {supplier.email}</p>}
                {supplier.instagram && <p>📸 {supplier.instagram}</p>}
                {(supplier.city || supplier.state) && (
                  <p>
                    📍 {supplier.city}
                    {supplier.city && supplier.state ? '/' : ''}
                    {supplier.state}
                  </p>
                )}
                {supplier.reliability_score != null && (
                  <p className="text-amber-500">
                    {'★'.repeat(supplier.reliability_score)}
                    <span className="text-gray-300">
                      {'★'.repeat(5 - supplier.reliability_score)}
                    </span>
                  </p>
                )}
                {supplier.notes && <p className="text-gray-500 italic">{supplier.notes}</p>}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm font-semibold text-green-700 bg-green-50 px-3 py-2 rounded-xl"
                >
                  Editar
                </button>
                <button
                  onClick={handleArchive}
                  disabled={isPending}
                  className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-xl"
                >
                  Arquivar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Espécies oferecidas ─────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Espécies que oferece ({supplier.species.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPaste((v) => !v)
                  setAddingSpecies(false)
                }}
                className="text-sm font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-xl"
              >
                📋 Colar lista
              </button>
              <button
                onClick={() => {
                  setAddingSpecies((v) => !v)
                  setShowPaste(false)
                }}
                className="text-sm font-bold text-white bg-green-700 px-3 py-1.5 rounded-xl"
              >
                + Espécie
              </button>
            </div>
          </div>

          {showPaste && (
            <SpeciesPasteImport
              supplierId={supplier.id}
              species={allSpecies}
              onClose={() => setShowPaste(false)}
              onImported={(count) => {
                setShowPaste(false)
                showToast(`${count} espécie(s) importadas!`, 'success')
                router.refresh()
              }}
            />
          )}

          {addingSpecies && (
            <SupplierSpeciesEditor
              supplierId={supplier.id}
              speciesItems={speciesItems}
              onCancel={() => setAddingSpecies(false)}
              onSaved={() => {
                setAddingSpecies(false)
                showToast('Espécie adicionada!', 'success')
                router.refresh()
              }}
            />
          )}

          {supplier.species.length === 0 && !addingSpecies && !showPaste ? (
            <p className="text-gray-400 text-center py-8 text-sm">
              Nenhuma espécie ainda. Use “Colar lista” quando o fornecedor mandar a
              lista dele no WhatsApp.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {supplier.species.map((row) =>
                editingRowId === row.id ? (
                  <SupplierSpeciesEditor
                    key={row.id}
                    supplierId={supplier.id}
                    row={row}
                    speciesItems={speciesItems}
                    onCancel={() => setEditingRowId(null)}
                    onSaved={() => {
                      setEditingRowId(null)
                      showToast('Espécie atualizada!', 'success')
                      router.refresh()
                    }}
                  />
                ) : (
                  <div key={row.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">
                          {row.common_name}
                          {row.scientific_name && (
                            <span className="ml-2 text-xs italic text-gray-400">
                              {row.scientific_name}
                            </span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-sm text-gray-500">
                          {row.size && <span>📏 {row.size}</span>}
                          {row.container && <span>🪴 {row.container}</span>}
                          {row.unit_price != null && (
                            <span className="font-semibold text-green-700">
                              {formatPriceBR(row.unit_price)}
                            </span>
                          )}
                          {row.min_quantity != null && <span>mín. {row.min_quantity}</span>}
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${AVAILABILITY_META[row.availability].badge}`}
                          >
                            {AVAILABILITY_META[row.availability].label}
                          </span>
                        </div>
                        {row.notes && (
                          <p className="mt-1 text-xs text-gray-400 italic">{row.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => setEditingRowId(row.id)}
                          className="text-sm font-semibold text-green-700 px-2 py-1"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleRemoveSpecies(row)}
                          disabled={isPending}
                          className="text-sm font-bold text-red-500 px-2 py-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
