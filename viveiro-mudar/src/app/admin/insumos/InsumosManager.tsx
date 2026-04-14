'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import {
  createInsumo,
  updateInsumo,
  toggleInsumoAtivo,
  getPriceHistory,
  type InputCategory,
  type InputPayload,
} from './actions'

interface Input {
  id: string
  name: string
  category: InputCategory
  unit_of_measure: string
  cost_per_unit: number | null
  supplier: string | null
  last_purchase_date: string | null
  active: boolean
}

interface PriceHistoryEntry {
  cost_per_unit: number
  changed_at: string
  notes: string | null
}

const CATEGORIES: { value: InputCategory; label: string }[] = [
  { value: 'substrato',  label: 'Substrato' },
  { value: 'adubo',      label: 'Adubo' },
  { value: 'defensivo',  label: 'Defensivo' },
  { value: 'recipiente', label: 'Recipiente' },
  { value: 'outros',     label: 'Outros' },
]

const CATEGORY_LABEL: Record<InputCategory, string> = {
  substrato: 'Substrato', adubo: 'Adubo', defensivo: 'Defensivo',
  recipiente: 'Recipiente', outros: 'Outros',
}

function emptyForm(): InputPayload {
  return { name: '', category: 'substrato', unit_of_measure: '', cost_per_unit: null, supplier: '', last_purchase_date: '', active: true }
}

function toNum(s: string): number | null { return s.trim() === '' ? null : Number(s) }
function numField(v: number | null) { return v !== null ? String(v) : '' }

interface ToastState { message: string; type: ToastType }

export default function InsumosManager({ initialInputs }: { initialInputs: Input[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [editingItem, setEditingItem] = useState<Input | null>(null)
  const [form, setForm] = useState<InputPayload>(emptyForm())
  const [toast, setToast] = useState<ToastState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [historyMap, setHistoryMap] = useState<Record<string, PriceHistoryEntry[]>>({})
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null)

  function showToast(m: string, type: ToastType) { setToast({ message: m, type }) }

  function openCreate() {
    setEditingItem(null); setForm(emptyForm()); setMode('form')
  }

  function openEdit(item: Input) {
    setEditingItem(item)
    setForm({
      name: item.name,
      category: item.category,
      unit_of_measure: item.unit_of_measure,
      cost_per_unit: item.cost_per_unit,
      supplier: item.supplier ?? '',
      last_purchase_date: item.last_purchase_date ?? '',
      active: item.active,
    })
    setMode('form')
  }

  async function loadHistory(id: string) {
    if (historyMap[id]) return // já carregado
    setLoadingHistory(id)
    const history = await getPriceHistory(id)
    setHistoryMap(m => ({ ...m, [id]: history as PriceHistoryEntry[] }))
    setLoadingHistory(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const result = editingItem
        ? await updateInsumo(editingItem.id, form)
        : await createInsumo(form)
      if (result.error) { showToast(`Erro: ${result.error}`, 'error'); return }
      showToast(editingItem ? 'Insumo atualizado!' : 'Insumo cadastrado!', 'success')
      setMode('list')
      startTransition(() => router.refresh())
    } finally {
      setSubmitting(false)
    }
  }

  function handleToggleActive(item: Input) {
    if (!window.confirm(`Deseja ${item.active ? 'desativar' : 'ativar'} "${item.name}"?`)) return
    startTransition(async () => {
      const result = await toggleInsumoAtivo(item.id, !item.active)
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
            {editingItem ? 'Editar Insumo' : 'Novo Insumo'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label className="label">Nome *</label>
            <input type="text" required value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Substrato Florestal" className="input" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="label">Categoria *</label>
              <select required value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as InputCategory }))}
                className="input">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="label">Unidade *</label>
              <input type="text" required value={form.unit_of_measure}
                onChange={e => setForm(f => ({ ...f, unit_of_measure: e.target.value }))}
                placeholder="kg, L, saco…" className="input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="label">Custo/unid. (R$)</label>
              <input type="number" min="0" step="0.01" value={numField(form.cost_per_unit)}
                onChange={e => setForm(f => ({ ...f, cost_per_unit: toNum(e.target.value) }))}
                placeholder="0.00" className="input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label">Última compra</label>
              <input type="date" value={form.last_purchase_date}
                onChange={e => setForm(f => ({ ...f, last_purchase_date: e.target.value }))}
                className="input" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="label">Fornecedor</label>
            <input type="text" value={form.supplier}
              onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
              placeholder="Nome do fornecedor" className="input" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              className="w-5 h-5 accent-green-700" />
            <span className="text-base font-medium text-gray-700">Insumo ativo</span>
          </label>

          {editingItem && (
            <p className="text-xs text-gray-400">
              Ao alterar o preço, o valor anterior será salvo no histórico automaticamente.
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Salvando…' : editingItem ? 'Salvar alterações' : 'Cadastrar insumo'}
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
        <h2 className="text-xl font-bold text-gray-800">Insumos</h2>
        <button onClick={openCreate} className="btn-primary px-5 py-3 text-base w-auto">+ Novo</button>
      </div>

      {initialInputs.length === 0 ? (
        <p className="text-gray-400 text-center py-16">Nenhum insumo cadastrado.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {initialInputs.map(item => {
            const history = historyMap[item.id]
            const isLoadingThis = loadingHistory === item.id

            return (
              <div key={item.id}
                className={`bg-white rounded-2xl shadow-sm border-2 p-4 ${item.active ? 'border-transparent' : 'border-gray-200 opacity-60'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{item.name}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                        {CATEGORY_LABEL[item.category]}
                      </span>
                      <span className="text-xs text-gray-500">{item.unit_of_measure}</span>
                      {item.cost_per_unit != null && (
                        <span className="text-xs font-semibold text-gray-700">
                          {Number(item.cost_per_unit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/{item.unit_of_measure}
                        </span>
                      )}
                    </div>
                    {item.supplier && <p className="text-xs text-gray-400 mt-1">{item.supplier}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(item)}
                      className="text-sm font-semibold text-green-700 bg-green-50 px-3 py-2 rounded-xl">
                      Editar
                    </button>
                    <button onClick={() => handleToggleActive(item)} disabled={isPending}
                      className={`text-sm font-semibold px-3 py-2 rounded-xl ${item.active ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-100'}`}>
                      {item.active ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </div>

                {/* Histórico de preço */}
                <div className="mt-3 border-t border-gray-100 pt-2">
                  <button
                    onClick={() => loadHistory(item.id)}
                    className="text-xs text-green-700 font-semibold"
                    disabled={isLoadingThis}
                  >
                    {isLoadingThis ? 'Carregando…' : history ? 'Ocultar histórico' : 'Ver histórico de preço'}
                  </button>
                  {history && history.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {history.map((h, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-500">
                          <span>{new Date(h.changed_at).toLocaleDateString('pt-BR')}</span>
                          <span>{Number(h.cost_per_unit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {history && history.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">Sem histórico de alterações.</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
