'use client'

import { useState, useTransition } from 'react'
import { UFS } from '@/lib/customers'
import {
  SUPPLIER_STATUSES,
  SUPPLIER_STATUS_META,
  type SupplierInput,
  type SupplierStatus,
} from '@/lib/suppliers'
import { createSupplier, updateSupplier } from './actions'

export interface SupplierRecord {
  id: string
  name: string
  contact_name: string | null
  whatsapp: string | null
  phone: string | null
  email: string | null
  instagram: string | null
  city: string | null
  state: string | null
  notes: string | null
  reliability_score: number | null
  status: SupplierStatus
}

interface Props {
  supplier: SupplierRecord | null
  onCancel: () => void
  onSaved: () => void
}

/** Form de criar/editar fornecedor — campos simples, mobile-first. */
export default function SupplierForm({ supplier, onCancel, onSaved }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<SupplierInput>({
    name: supplier?.name ?? '',
    contact_name: supplier?.contact_name ?? '',
    whatsapp: supplier?.whatsapp ?? '',
    phone: supplier?.phone ?? '',
    email: supplier?.email ?? '',
    instagram: supplier?.instagram ?? '',
    city: supplier?.city ?? '',
    state: supplier?.state ?? '',
    notes: supplier?.notes ?? '',
    reliability_score: supplier?.reliability_score ?? null,
    status: supplier?.status ?? 'lead',
  })

  function patch(p: Partial<SupplierInput>) {
    setForm((f) => ({ ...f, ...p }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = supplier
        ? await updateSupplier(supplier.id, form)
        : await createSupplier(form)
      if (result.error) {
        setError(result.error)
        return
      }
      onSaved()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
      <div>
        <label className="label" htmlFor="sup-name">Nome do viveiro/produtor *</label>
        <input
          id="sup-name"
          type="text"
          value={form.name ?? ''}
          onChange={(e) => patch({ name: e.target.value })}
          className="input"
          required
          autoFocus={!supplier}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="sup-contact">Pessoa de contato</label>
          <input
            id="sup-contact"
            type="text"
            value={form.contact_name ?? ''}
            onChange={(e) => patch({ contact_name: e.target.value })}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="sup-whatsapp">WhatsApp</label>
          <input
            id="sup-whatsapp"
            type="tel"
            inputMode="tel"
            value={form.whatsapp ?? ''}
            onChange={(e) => patch({ whatsapp: e.target.value })}
            placeholder="(47) 99999-8888"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="sup-phone">Outro telefone</label>
          <input
            id="sup-phone"
            type="tel"
            inputMode="tel"
            value={form.phone ?? ''}
            onChange={(e) => patch({ phone: e.target.value })}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="sup-email">E-mail</label>
          <input
            id="sup-email"
            type="email"
            value={form.email ?? ''}
            onChange={(e) => patch({ email: e.target.value })}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="sup-instagram">Instagram</label>
          <input
            id="sup-instagram"
            type="text"
            value={form.instagram ?? ''}
            onChange={(e) => patch({ instagram: e.target.value })}
            placeholder="@viveiro"
            className="input"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="label" htmlFor="sup-city">Cidade</label>
            <input
              id="sup-city"
              type="text"
              value={form.city ?? ''}
              onChange={(e) => patch({ city: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="sup-state">UF</label>
            <select
              id="sup-state"
              value={form.state ?? ''}
              onChange={(e) => patch({ state: e.target.value })}
              className="input"
            >
              <option value="">—</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="sup-status">Situação</label>
          <select
            id="sup-status"
            value={form.status ?? 'lead'}
            onChange={(e) => patch({ status: e.target.value as SupplierStatus })}
            className="input"
          >
            {SUPPLIER_STATUSES.map((s) => (
              <option key={s} value={s}>{SUPPLIER_STATUS_META[s].label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            {SUPPLIER_STATUS_META[form.status ?? 'lead'].hint}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="sup-score">Confiança (0 a 5)</label>
          <select
            id="sup-score"
            value={form.reliability_score ?? ''}
            onChange={(e) =>
              patch({
                reliability_score: e.target.value === '' ? null : Number(e.target.value),
              })
            }
            className="input"
          >
            <option value="">Sem nota</option>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{'★'.repeat(n) || '0'}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="sup-notes">Observações</label>
        <textarea
          id="sup-notes"
          rows={3}
          value={form.notes ?? ''}
          onChange={(e) => patch({ notes: e.target.value })}
          className="input resize-none"
        />
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className="btn-primary flex-1">
          {isPending ? 'Salvando…' : supplier ? 'Salvar alterações' : 'Cadastrar fornecedor'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
