'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import {
  createCustoFixo,
  deleteCustoFixo,
  type FixedCostCategory,
  type FixedCostPayload,
} from './actions'

interface FixedCost {
  id: string
  category: FixedCostCategory
  monthly_amount: number
  reference_month: string
  notes: string | null
}

const CATEGORIES: { value: FixedCostCategory; label: string }[] = [
  { value: 'salarios',     label: 'Salários' },
  { value: 'energia',      label: 'Energia' },
  { value: 'agua',         label: 'Água' },
  { value: 'manutencao',   label: 'Manutenção' },
  { value: 'combustivel',  label: 'Combustível' },
  { value: 'depreciacao',  label: 'Depreciação' },
  { value: 'outros',       label: 'Outros' },
]

const CATEGORY_LABEL: Record<FixedCostCategory, string> = {
  salarios: 'Salários', energia: 'Energia', agua: 'Água',
  manutencao: 'Manutenção', combustivel: 'Combustível',
  depreciacao: 'Depreciação', outros: 'Outros',
}

// Mês atual para o campo padrão
function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function emptyForm(): FixedCostPayload {
  return { category: 'salarios', monthly_amount: 0, reference_month: currentMonth(), notes: '' }
}

interface ToastState { message: string; type: ToastType }

export default function CustosFixosManager({ initialCosts }: { initialCosts: FixedCost[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [form, setForm] = useState<FixedCostPayload>(emptyForm())
  const [toast, setToast] = useState<ToastState | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function showToast(m: string, type: ToastType) { setToast({ message: m, type }) }

  // Agrupa por mês para exibição
  const byMonth: Record<string, FixedCost[]> = {}
  for (const cost of initialCosts) {
    const month = cost.reference_month.slice(0, 7)
    if (!byMonth[month]) byMonth[month] = []
    byMonth[month].push(cost)
  }
  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a))

  function totalByMonth(costs: FixedCost[]) {
    return costs.reduce((sum, c) => sum + Number(c.monthly_amount), 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || form.monthly_amount <= 0) return
    setSubmitting(true)
    try {
      const result = await createCustoFixo(form)
      if (result.error) { showToast(`Erro: ${result.error}`, 'error'); return }
      showToast('Custo fixo registrado!', 'success')
      setForm(emptyForm())
      setMode('list')
      startTransition(() => router.refresh())
    } finally {
      setSubmitting(false)
    }
  }

  function handleDelete(id: string) {
    if (!window.confirm('Excluir este registro de custo fixo?')) return
    startTransition(async () => {
      const result = await deleteCustoFixo(id)
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
          <h2 className="text-xl font-bold text-gray-800">Registrar Custo Fixo</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label className="label">Categoria *</label>
            <select required value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as FixedCostCategory }))}
              className="input">
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="label">Valor mensal (R$) *</label>
              <input type="number" min="0.01" step="0.01" required
                value={form.monthly_amount || ''}
                onChange={e => setForm(f => ({ ...f, monthly_amount: Number(e.target.value) }))}
                placeholder="0.00" className="input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label">Mês de referência *</label>
              <input type="month" required value={form.reference_month}
                onChange={e => setForm(f => ({ ...f, reference_month: e.target.value }))}
                className="input" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="label">Observações</label>
            <textarea rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Detalhes opcionais…" className="input resize-none" />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Salvando…' : 'Registrar custo'}
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
        <h2 className="text-xl font-bold text-gray-800">Custos Fixos</h2>
        <button onClick={() => setMode('form')} className="btn-primary px-5 py-3 text-base w-auto">
          + Registrar
        </button>
      </div>

      {months.length === 0 ? (
        <p className="text-gray-400 text-center py-16">Nenhum custo fixo registrado.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {months.map(month => {
            const costs = byMonth[month]
            const total = totalByMonth(costs)
            const [year, m] = month.split('-')
            const label = new Date(Number(year), Number(m) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

            return (
              <div key={month}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-700 capitalize">{label}</h3>
                  <span className="text-sm font-bold text-green-800">
                    Total: {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {costs.map(item => (
                    <div key={item.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-800">{CATEGORY_LABEL[item.category]}</p>
                        {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900">
                          {Number(item.monthly_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={isPending}
                          className="text-red-500 text-sm font-semibold bg-red-50 px-3 py-1.5 rounded-lg"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
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
