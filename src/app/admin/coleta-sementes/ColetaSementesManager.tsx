'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import { createColeta, deleteColeta, type SeedCollectionPayload } from './actions'

interface Collection {
  id: string
  species_id: string
  species: { common_name: string } | null
  collection_region: string | null
  distance_km: number | null
  fuel_cost: number | null
  labor_hours: number | null
  labor_cost_per_hour: number | null
  total_cost: number
  seeds_collected_qty: number | null
  cost_per_seed: number | null
  collection_date: string
}

interface SpeciesOption {
  id: string
  common_name: string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function toNum(s: string): number | null { return s.trim() === '' ? null : Number(s) }
function numField(v: number | null) { return v !== null ? String(v) : '' }

function emptyForm(): SeedCollectionPayload {
  return {
    species_id: '',
    collection_region: '',
    distance_km: null,
    fuel_cost: null,
    labor_hours: null,
    labor_cost_per_hour: null,
    total_cost: 0,
    seeds_collected_qty: null,
    collection_date: today(),
  }
}

interface ToastState { message: string; type: ToastType }

export default function ColetaSementesManager({
  initialCollections,
  speciesOptions,
}: {
  initialCollections: Collection[]
  speciesOptions: SpeciesOption[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [form, setForm] = useState<SeedCollectionPayload>(emptyForm())
  const [toast, setToast] = useState<ToastState | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function showToast(m: string, type: ToastType) { setToast({ message: m, type }) }

  // Calcula total_cost automaticamente se combustível + mão de obra preenchidos
  useEffect(() => {
    const fuel = form.fuel_cost ?? 0
    const labor = (form.labor_hours ?? 0) * (form.labor_cost_per_hour ?? 0)
    const auto = fuel + labor
    if (auto > 0) {
      setForm(f => ({ ...f, total_cost: parseFloat(auto.toFixed(2)) }))
    }
  }, [form.fuel_cost, form.labor_hours, form.labor_cost_per_hour])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || !form.species_id || form.total_cost <= 0) return
    setSubmitting(true)
    try {
      const result = await createColeta(form)
      if (result.error) { showToast(`Erro: ${result.error}`, 'error'); return }
      showToast('Coleta registrada!', 'success')
      setForm(emptyForm())
      setMode('list')
      startTransition(() => router.refresh())
    } finally {
      setSubmitting(false)
    }
  }

  function handleDelete(id: string) {
    if (!window.confirm('Excluir este registro de coleta?')) return
    startTransition(async () => {
      const result = await deleteColeta(id)
      if (result.error) showToast(`Erro: ${result.error}`, 'error')
      else { showToast('Registro excluído.', 'success'); router.refresh() }
    })
  }

  // ─── FORMULÁRIO ────────────────────────────────────────────
  if (mode === 'form') {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setMode('list')} className="text-green-700 font-bold text-2xl">←</button>
          <h2 className="text-xl font-bold text-gray-800">Registrar Coleta</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Espécie */}
          <div className="flex flex-col gap-1">
            <label className="label">Espécie *</label>
            <select required value={form.species_id}
              onChange={e => setForm(f => ({ ...f, species_id: e.target.value }))}
              className="input">
              <option value="">Selecione a espécie…</option>
              {speciesOptions.map(s => (
                <option key={s.id} value={s.id}>{s.common_name}</option>
              ))}
            </select>
          </div>

          {/* Data + Região */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="label">Data da coleta *</label>
              <input type="date" required value={form.collection_date}
                onChange={e => setForm(f => ({ ...f, collection_date: e.target.value }))}
                className="input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label">Região</label>
              <input type="text" value={form.collection_region}
                onChange={e => setForm(f => ({ ...f, collection_region: e.target.value }))}
                placeholder="Ex: Serra Dona Francisca" className="input" />
            </div>
          </div>

          {/* Deslocamento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="label">Distância (km)</label>
              <input type="number" min="0" step="0.1" value={numField(form.distance_km)}
                onChange={e => setForm(f => ({ ...f, distance_km: toNum(e.target.value) }))}
                placeholder="0.0" className="input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label">Custo combustível (R$)</label>
              <input type="number" min="0" step="0.01" value={numField(form.fuel_cost)}
                onChange={e => setForm(f => ({ ...f, fuel_cost: toNum(e.target.value) }))}
                placeholder="0.00" className="input" />
            </div>
          </div>

          {/* Mão de obra */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="label">Horas trabalhadas</label>
              <input type="number" min="0" step="0.5" value={numField(form.labor_hours)}
                onChange={e => setForm(f => ({ ...f, labor_hours: toNum(e.target.value) }))}
                placeholder="0.0" className="input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label">Custo/hora (R$)</label>
              <input type="number" min="0" step="0.01" value={numField(form.labor_cost_per_hour)}
                onChange={e => setForm(f => ({ ...f, labor_cost_per_hour: toNum(e.target.value) }))}
                placeholder="0.00" className="input" />
            </div>
          </div>

          {/* Total + Sementes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="label">Custo total (R$) *</label>
              <input type="number" min="0.01" step="0.01" required value={form.total_cost || ''}
                onChange={e => setForm(f => ({ ...f, total_cost: Number(e.target.value) }))}
                placeholder="Calculado auto ou manual" className="input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label">Sementes coletadas</label>
              <input type="number" min="0" step="1" value={numField(form.seeds_collected_qty)}
                onChange={e => setForm(f => ({ ...f, seeds_collected_qty: toNum(e.target.value) }))}
                placeholder="qtd." className="input" />
            </div>
          </div>

          {form.total_cost > 0 && form.seeds_collected_qty && form.seeds_collected_qty > 0 && (
            <div className="bg-green-50 rounded-xl px-4 py-3 text-sm text-green-800 font-semibold">
              Custo estimado por semente:{' '}
              {(form.total_cost / form.seeds_collected_qty).toLocaleString('pt-BR', {
                style: 'currency', currency: 'BRL', minimumFractionDigits: 4,
              })}
            </div>
          )}

          <button type="submit" disabled={submitting || !form.species_id || form.total_cost <= 0} className="btn-primary">
            {submitting ? 'Salvando…' : 'Registrar coleta'}
          </button>
        </form>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    )
  }

  // ─── LISTA ─────────────────────────────────────────────────
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Coleta de Sementes</h2>
        <button onClick={() => setMode('form')} className="btn-primary px-5 py-3 text-base w-auto">
          + Registrar
        </button>
      </div>

      {initialCollections.length === 0 ? (
        <p className="text-gray-400 text-center py-16">Nenhuma coleta registrada.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {initialCollections.map(item => (
            <div key={item.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">
                    {item.species?.common_name ?? '—'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(item.collection_date).toLocaleDateString('pt-BR')}
                    {item.collection_region && ` · ${item.collection_region}`}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm">
                    <span className="font-bold text-gray-900">
                      {Number(item.total_cost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    {item.seeds_collected_qty != null && (
                      <span className="text-gray-500">{item.seeds_collected_qty} sementes</span>
                    )}
                    {item.cost_per_seed != null && (
                      <span className="text-green-700 font-semibold">
                        {Number(item.cost_per_seed).toLocaleString('pt-BR', {
                          style: 'currency', currency: 'BRL', minimumFractionDigits: 4,
                        })}/semente
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={isPending}
                  className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-xl flex-shrink-0"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
