'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import {
  createRecipiente,
  updateRecipiente,
  toggleRecipienteAtivo,
  type ContainerPayload,
} from './actions'

interface Container {
  id: string
  name: string
  volume_liters: number | null
  substrate_per_unit_liters: number | null
  unit_cost: number | null
  active: boolean
}

function emptyForm(): ContainerPayload {
  return { name: '', volume_liters: null, substrate_per_unit_liters: null, unit_cost: null, active: true }
}

interface ToastState { message: string; type: ToastType }

function numField(val: number | null) {
  return val !== null ? String(val) : ''
}
function toNum(s: string): number | null {
  return s.trim() === '' ? null : Number(s)
}

export default function RecipientesManager({ initialContainers }: { initialContainers: Container[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [editingItem, setEditingItem] = useState<Container | null>(null)
  const [form, setForm] = useState<ContainerPayload>(emptyForm())
  const [toast, setToast] = useState<ToastState | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function showToast(message: string, type: ToastType) { setToast({ message, type }) }

  function openCreate() {
    setEditingItem(null)
    setForm(emptyForm())
    setMode('form')
  }

  function openEdit(item: Container) {
    setEditingItem(item)
    setForm({
      name: item.name,
      volume_liters: item.volume_liters,
      substrate_per_unit_liters: item.substrate_per_unit_liters,
      unit_cost: item.unit_cost,
      active: item.active,
    })
    setMode('form')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const result = editingItem
        ? await updateRecipiente(editingItem.id, form)
        : await createRecipiente(form)
      if (result.error) { showToast(`Erro: ${result.error}`, 'error'); return }
      showToast(editingItem ? 'Recipiente atualizado!' : 'Recipiente cadastrado!', 'success')
      setMode('list')
      startTransition(() => router.refresh())
    } finally {
      setSubmitting(false)
    }
  }

  function handleToggleActive(item: Container) {
    if (!window.confirm(`Deseja ${item.active ? 'desativar' : 'ativar'} "${item.name}"?`)) return
    startTransition(async () => {
      const result = await toggleRecipienteAtivo(item.id, !item.active)
      if (result.error) showToast(`Erro: ${result.error}`, 'error')
      else { showToast(item.active ? 'Desativado.' : 'Ativado!', 'success'); router.refresh() }
    })
  }

  // ─── FORMULÁRIO ────────────────────────────────────────────
  if (mode === 'form') {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setMode('list')} className="text-green-700 font-bold text-2xl">←</button>
          <h2 className="text-xl font-bold text-gray-800">
            {editingItem ? 'Editar Recipiente' : 'Novo Recipiente'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label className="label">Nome *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: tubete, 17x22, balde"
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="label">Volume (L)</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={numField(form.volume_liters)}
                onChange={(e) => setForm(f => ({ ...f, volume_liters: toNum(e.target.value) }))}
                placeholder="0.000"
                className="input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label">Substrato (L)</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={numField(form.substrate_per_unit_liters)}
                onChange={(e) => setForm(f => ({ ...f, substrate_per_unit_liters: toNum(e.target.value) }))}
                placeholder="0.000"
                className="input"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="label">Custo unitário (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={numField(form.unit_cost)}
              onChange={(e) => setForm(f => ({ ...f, unit_cost: toNum(e.target.value) }))}
              placeholder="0.00"
              className="input"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm(f => ({ ...f, active: e.target.checked }))}
              className="w-5 h-5 accent-green-700"
            />
            <span className="text-base font-medium text-gray-700">Recipiente ativo</span>
          </label>

          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Salvando…' : editingItem ? 'Salvar alterações' : 'Cadastrar recipiente'}
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
        <h2 className="text-xl font-bold text-gray-800">Recipientes</h2>
        <button onClick={openCreate} className="btn-primary px-5 py-3 text-base w-auto">+ Novo</button>
      </div>

      {initialContainers.length === 0 ? (
        <p className="text-gray-400 text-center py-16">Nenhum recipiente cadastrado.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {initialContainers.map(item => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl shadow-sm border-2 p-4 ${item.active ? 'border-transparent' : 'border-gray-200 opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900 text-lg">{item.name}</p>
                  <div className="flex gap-4 mt-1 text-sm text-gray-500">
                    {item.volume_liters != null && <span>Vol: {item.volume_liters} L</span>}
                    {item.substrate_per_unit_liters != null && <span>Substrato: {item.substrate_per_unit_liters} L</span>}
                    {item.unit_cost != null && (
                      <span>Custo: {item.unit_cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(item)}
                    className="text-sm font-semibold text-green-700 bg-green-50 px-3 py-2 rounded-xl"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleActive(item)}
                    disabled={isPending}
                    className={`text-sm font-semibold px-3 py-2 rounded-xl ${item.active ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-100'}`}
                  >
                    {item.active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
