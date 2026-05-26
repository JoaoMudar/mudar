'use client'

import { useMemo, useState } from 'react'
import {
  UFS,
  onlyDigits,
  getMissingFiscalFields,
  isFiscallyComplete,
  type PersonType,
  type FiscalCustomer,
} from '@/lib/customers'
import { createCustomer, updateCustomer, type CustomerInput } from './actions'

// Registro vindo do banco (getCustomerById). Todos os campos fiscais sao nullable.
export interface CustomerRecord {
  id: string
  name: string
  phone: string | null
  city: string | null
  state: string | null
  notes: string | null
  person_type: PersonType | null
  document: string | null
  email: string | null
  legal_name: string | null
  trade_name: string | null
  state_registration: string | null
  ie_exempt: boolean | null
  zip_code: string | null
  street: string | null
  address_number: string | null
  complement: string | null
  neighborhood: string | null
}

interface Props {
  customer?: CustomerRecord | null
  onSaved: (result: { id?: string; complete: boolean }) => void
  onCancel?: () => void
  submitLabel?: string
}

interface FormState {
  person_type: PersonType | null
  name: string
  legal_name: string
  trade_name: string
  document: string
  state_registration: string
  ie_exempt: boolean
  email: string
  zip_code: string
  street: string
  address_number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  phone: string
  notes: string
}

function initState(c?: CustomerRecord | null): FormState {
  return {
    // Novo cliente assume PF (mais comum); edicao preserva o tipo atual (pode ser null/legado).
    person_type: c ? c.person_type : 'pf',
    name: c?.name ?? '',
    legal_name: c?.legal_name ?? '',
    trade_name: c?.trade_name ?? '',
    document: c?.document ?? '',
    state_registration: c?.state_registration ?? '',
    ie_exempt: c?.ie_exempt ?? false,
    email: c?.email ?? '',
    zip_code: c?.zip_code ?? '',
    street: c?.street ?? '',
    address_number: c?.address_number ?? '',
    complement: c?.complement ?? '',
    neighborhood: c?.neighborhood ?? '',
    city: c?.city ?? '',
    state: c?.state ?? 'SC',
    phone: c?.phone ?? '',
    notes: c?.notes ?? '',
  }
}

// --- Mascaras progressivas (exibicao). O estado guarda so digitos. ---
function maskCPF(d: string): string {
  d = d.slice(0, 11)
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`
  return d
}
function maskCNPJ(d: string): string {
  d = d.slice(0, 14)
  if (d.length > 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
  if (d.length > 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  if (d.length > 5) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length > 2) return `${d.slice(0, 2)}.${d.slice(2)}`
  return d
}
function maskCEP(d: string): string {
  d = d.slice(0, 8)
  if (d.length > 5) return `${d.slice(0, 5)}-${d.slice(5)}`
  return d
}

export default function CustomerFiscalForm({
  customer,
  onSaved,
  onCancel,
  submitLabel = 'Salvar cliente',
}: Props) {
  const [form, setForm] = useState<FormState>(() => initState(customer))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isPF = form.person_type === 'pf'
  const isPJ = form.person_type === 'pj'

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // Nome de exibicao: PJ usa nome fantasia (ou razao social); PF usa o nome.
  const computedName = isPJ ? form.trade_name.trim() || form.legal_name.trim() : form.name.trim()

  // Objeto fiscal derivado do estado atual — fonte para o feedback de completude.
  const fiscal: FiscalCustomer = useMemo(
    () => ({
      name: computedName,
      person_type: form.person_type,
      document: form.document,
      email: form.email,
      legal_name: form.legal_name,
      trade_name: form.trade_name,
      state_registration: form.state_registration,
      ie_exempt: form.ie_exempt,
      zip_code: form.zip_code,
      street: form.street,
      address_number: form.address_number,
      complement: form.complement,
      neighborhood: form.neighborhood,
      city: form.city,
      state: form.state,
    }),
    [form, computedName],
  )

  const missing = getMissingFiscalFields(fiscal)
  const complete = missing.length === 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError(null)

    const payload: CustomerInput = {
      name: computedName,
      phone: form.phone,
      city: form.city,
      state: form.state,
      notes: form.notes,
      person_type: form.person_type,
      document: form.document,
      email: form.email,
      legal_name: form.legal_name,
      trade_name: form.trade_name,
      state_registration: form.state_registration,
      ie_exempt: form.ie_exempt,
      zip_code: form.zip_code,
      street: form.street,
      address_number: form.address_number,
      complement: form.complement,
      neighborhood: form.neighborhood,
    }

    setSubmitting(true)
    try {
      const result = customer?.id
        ? await updateCustomer(customer.id, payload)
        : await createCustomer(payload)
      if (result.error) {
        setError(result.error)
        return
      }
      onSaved({
        id: customer?.id ?? (result as { id?: string }).id,
        complete: isFiscallyComplete(fiscal),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Tipo de pessoa */}
      <div className="flex flex-col gap-1">
        <span className="label">Tipo</span>
        <div className="flex gap-2">
          {(['pf', 'pj'] as PersonType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('person_type', t)}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                form.person_type === t
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white text-gray-700 border-gray-200'
              }`}
            >
              {t === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'}
            </button>
          ))}
        </div>
      </div>

      {/* Identificacao: PF x PJ (so aparece apos escolher o tipo) */}
      {form.person_type == null && (
        <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          Selecione <strong>Pessoa Física</strong> ou <strong>Pessoa Jurídica</strong> para informar o documento.
        </p>
      )}
      {isPJ && (
        <>
          <Field label="Razão social *">
            <input
              type="text"
              value={form.legal_name}
              onChange={(e) => set('legal_name', e.target.value)}
              placeholder="Ex: Paisagismo Verde Ltda"
              className="input"
            />
          </Field>
          <Field label="Nome fantasia" hint="vira o nome exibido do cliente">
            <input
              type="text"
              value={form.trade_name}
              onChange={(e) => set('trade_name', e.target.value)}
              placeholder="Ex: Verde"
              className="input"
            />
          </Field>
          <Field label="CNPJ">
            <input
              type="text"
              inputMode="numeric"
              value={maskCNPJ(form.document)}
              onChange={(e) => set('document', onlyDigits(e.target.value).slice(0, 14))}
              placeholder="00.000.000/0000-00"
              className="input"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Inscrição Estadual">
              <input
                type="text"
                value={form.state_registration}
                onChange={(e) => set('state_registration', e.target.value)}
                disabled={form.ie_exempt}
                placeholder={form.ie_exempt ? 'Isento' : 'IE'}
                className="input disabled:bg-gray-100 disabled:text-gray-400"
              />
            </Field>
            <label className="flex items-center gap-2 pt-7 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={form.ie_exempt}
                onChange={(e) => set('ie_exempt', e.target.checked)}
                className="w-5 h-5 accent-green-700"
              />
              Isento de IE
            </label>
          </div>
        </>
      )}
      {isPF && (
        <>
          <Field label="Nome completo *">
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ex: João da Silva"
              className="input"
            />
          </Field>
          <Field label="CPF">
            <input
              type="text"
              inputMode="numeric"
              value={maskCPF(form.document)}
              onChange={(e) => set('document', onlyDigits(e.target.value).slice(0, 11))}
              placeholder="000.000.000-00"
              className="input"
            />
          </Field>
        </>
      )}

      {/* Contato fiscal */}
      <Field label="E-mail" hint="para envio de DANFE / XML">
        <input
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="cliente@email.com"
          className="input"
        />
      </Field>

      {/* Endereco */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="CEP">
          <input
            type="text"
            inputMode="numeric"
            value={maskCEP(form.zip_code)}
            onChange={(e) => set('zip_code', onlyDigits(e.target.value).slice(0, 8))}
            placeholder="00000-000"
            className="input"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Logradouro">
            <input
              type="text"
              value={form.street}
              onChange={(e) => set('street', e.target.value)}
              placeholder="Rua / Avenida"
              className="input"
            />
          </Field>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Número">
          <input
            type="text"
            value={form.address_number}
            onChange={(e) => set('address_number', e.target.value)}
            placeholder="123"
            className="input"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Complemento">
            <input
              type="text"
              value={form.complement}
              onChange={(e) => set('complement', e.target.value)}
              placeholder="Sala, bloco… (opcional)"
              className="input"
            />
          </Field>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-1">
          <Field label="Bairro">
            <input
              type="text"
              value={form.neighborhood}
              onChange={(e) => set('neighborhood', e.target.value)}
              className="input"
            />
          </Field>
        </div>
        <Field label="Cidade">
          <input
            type="text"
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
            className="input"
          />
        </Field>
        <Field label="UF">
          <select
            value={form.state}
            onChange={(e) => set('state', e.target.value)}
            className="input"
          >
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Contato geral */}
      <Field label="Telefone">
        <input
          type="text"
          inputMode="tel"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="(47) 99999-0000"
          className="input"
        />
      </Field>
      <Field label="Observações">
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          className="input resize-none"
        />
      </Field>

      {/* Feedback de completude fiscal (nao bloqueia o salvamento) */}
      {complete ? (
        <p className="text-sm font-semibold text-green-700">✓ Dados completos para emitir NF.</p>
      ) : (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          ⚠ Faltam para NF: {missing.join(', ')}.
          <span className="block text-xs text-amber-600 mt-0.5">
            Pode salvar assim mesmo (rascunho) — só não emite NF até completar.
          </span>
        </p>
      )}

      {error && (
        <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancelar
          </button>
        )}
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Salvando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label">
        {label}
        {hint && <span className="font-normal text-gray-400"> ({hint})</span>}
      </label>
      {children}
    </div>
  )
}
