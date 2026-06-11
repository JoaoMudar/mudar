'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Toast, { ToastType } from '@/components/Toast'
import Autocomplete, { AutocompleteItem } from '@/components/Autocomplete'
import { SALE_CHANNELS, type SaleChannel } from '@/lib/orders'
import { createOrder } from '../actions'
import { createCustomer } from '@/app/clientes/actions'
import { createSpeciesQuick } from '@/app/admin/especies/actions'
import PasteImport, { type ImportedItem } from './PasteImport'

interface Customer {
  id: string
  name: string
  phone: string | null
}
interface Species {
  id: string
  common_name: string
  scientific_name?: string | null
  tags?: string[] | null
  /** Sinonimos — a busca tambem encontra a especie por eles. */
  popular_names?: string[]
}
interface Container {
  id: string
  name: string
  volume_liters: number | null
}

interface Props {
  customers: Customer[]
  species: Species[]
  containers: Container[]
}

interface ItemRow {
  key: string
  is_generic: boolean
  species_id: string
  species_label: string
  container_id: string
  quantity: string
}

interface ToastState {
  message: string
  type: ToastType
}

let rowSeq = 0
/**
 * Cria uma nova linha de item. Se `template` for passado, herda recipiente e
 * quantidade dele (mas nunca a especie) — assim cada linha nova ja nasce
 * preenchida com o padrao da linha anterior, e quem cadastra so troca a especie.
 */
function newRow(template?: Pick<ItemRow, 'container_id' | 'quantity'>): ItemRow {
  rowSeq += 1
  return {
    key: `r${rowSeq}`,
    is_generic: false,
    species_id: '',
    species_label: '',
    container_id: template?.container_id ?? '',
    quantity: template?.quantity ?? '',
  }
}

export default function OrderForm({ customers, species, containers }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')

  const [channel, setChannel] = useState<SaleChannel>('atacado')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<ItemRow[]>(() => [newRow()])
  // Linha cuja busca de especie deve receber foco automatico (linha recem-criada).
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [showPaste, setShowPaste] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  // Lista local de especies (cresce com o cadastro rapido "+ Criar").
  const [speciesList, setSpeciesList] = useState<Species[]>(species)

  const speciesItems: AutocompleteItem[] = speciesList.map((s) => ({
    id: s.id,
    label: s.common_name,
    tags: s.tags ?? undefined,
    keywords: [
      ...(s.popular_names ?? []),
      ...(s.scientific_name ? [s.scientific_name] : []),
    ],
  }))
  const customerItems: AutocompleteItem[] = customers.map((c) => ({
    id: c.id,
    label: c.name,
    sublabel: c.phone ?? undefined,
  }))

  function showToast(message: string, type: ToastType) {
    setToast({ message, type })
  }

  function updateItem(key: string, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }
  function removeItem(key: string) {
    setItems((rows) => (rows.length === 1 ? rows : rows.filter((r) => r.key !== key)))
  }
  function addItem() {
    // Herda recipiente + quantidade da ultima linha (padrao do pedido).
    const last = items[items.length - 1]
    const row = newRow(
      last ? { container_id: last.container_id, quantity: last.quantity } : undefined,
    )
    setItems((rows) => [...rows, row])
    setFocusKey(row.key)
  }

  // Recebe os itens reconhecidos pela colagem e os anexa a lista. Se so havia a
  // linha vazia inicial, ela e substituida (nao deixa item em branco no meio).
  function appendImported(imported: ImportedItem[]) {
    const built: ItemRow[] = imported.map((it) => {
      rowSeq += 1
      return {
        key: `r${rowSeq}`,
        is_generic: it.is_generic,
        species_id: it.species_id,
        species_label: it.species_label,
        container_id: it.container_id,
        quantity: it.quantity,
      }
    })
    setItems((rows) => {
      const r0 = rows[0]
      const onlyEmpty =
        rows.length === 1 &&
        !r0.species_id &&
        !r0.quantity &&
        !r0.container_id &&
        !r0.is_generic
      return onlyEmpty ? built : [...rows, ...built]
    })
    setShowPaste(false)
    showToast(`${built.length} item(ns) adicionado(s).`, 'success')
  }

  function toggleGeneric(key: string) {
    setItems((rows) =>
      rows.map((r) =>
        r.key === key
          ? { ...r, is_generic: !r.is_generic, species_id: '', species_label: '' }
          : r,
      ),
    )
  }

  // Cadastro rapido de especie a partir da busca: cria, anexa a lista local e
  // seleciona na linha do item.
  async function handleQuickCreateSpecies(key: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const result = await createSpeciesQuick(trimmed)
    // Nome ja cadastrado (principal ou sinonimo): usa a especie existente.
    if (result.existing) {
      updateItem(key, {
        species_id: result.existing.id,
        species_label: result.existing.common_name,
      })
      showToast(`"${trimmed}" já existia — usei ${result.existing.common_name}.`, 'success')
      return
    }
    if (result.error || !result.id) {
      showToast(result.error ?? 'Erro ao criar espécie.', 'error')
      return
    }
    const created: Species = { id: result.id, common_name: trimmed, tags: [] }
    setSpeciesList((list) => [...list, created])
    updateItem(key, { species_id: created.id, species_label: created.common_name })
    showToast(`Espécie "${trimmed}" criada!`, 'success')
  }

  async function handleCreateCustomer() {
    const name = newCustomerName.trim()
    if (!name) {
      showToast('Informe o nome do cliente.', 'error')
      return
    }
    const result = await createCustomer({ name, phone: newCustomerPhone.trim() })
    if (result.error || !result.id) {
      showToast(result.error ?? 'Erro ao criar cliente.', 'error')
      return
    }
    setCustomerId(result.id)
    setCustomerName(name)
    setShowNewCustomer(false)
    setNewCustomerName('')
    setNewCustomerPhone('')
    showToast('Cliente criado!', 'success')
  }

  function validate(): string | null {
    if (!customerId) return 'Selecione um cliente.'
    if (items.length === 0) return 'Adicione pelo menos um item.'
    for (const it of items) {
      if (!it.container_id) return 'Selecione o recipiente de todos os itens.'
      if (!it.quantity || Number(it.quantity) <= 0)
        return 'Informe quantidade válida em todos os itens.'
      if (!it.is_generic && !it.species_id)
        return 'Selecione a espécie dos itens específicos.'
    }
    return null
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const error = validate()
    if (error) {
      showToast(error, 'error')
      return
    }
    startTransition(async () => {
      const result = await createOrder({
        customer_id: customerId,
        sale_channel: channel,
        delivery_date: deliveryDate || null,
        notes,
        items: items.map((it) => ({
          is_generic: it.is_generic,
          species_id: it.is_generic ? null : it.species_id,
          container_id: it.container_id,
          quantity: Number(it.quantity),
        })),
      })
      if (result.error) {
        showToast(`Erro: ${result.error}`, 'error')
        return
      }
      router.push('/pedidos')
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-4">
        <Link href="/pedidos" className="text-sm text-green-300 hover:text-white mb-1 inline-block">
          ← Pedidos
        </Link>
        <h1 className="text-xl font-bold">Novo Pedido</h1>
      </header>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-4 sm:p-6 space-y-7">
        {/* Secao 1: Cliente */}
        <section className="space-y-2">
          <label className="label">Cliente</label>
          {customerId ? (
            <div className="flex items-center justify-between bg-white border-2 border-green-200 rounded-xl px-4 py-3">
              <span className="font-semibold text-gray-900">{customerName}</span>
              <button
                type="button"
                onClick={() => {
                  setCustomerId('')
                  setCustomerName('')
                }}
                className="text-sm font-semibold text-green-700"
              >
                Trocar
              </button>
            </div>
          ) : showNewCustomer ? (
            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 space-y-3">
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Nome do cliente"
                className="input"
                autoFocus
              />
              <input
                type="text"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="Telefone (opcional)"
                className="input"
              />
              <div className="flex gap-2">
                <button type="button" onClick={handleCreateCustomer} className="btn-primary py-3 text-base">
                  Salvar cliente
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(false)}
                  className="btn-secondary py-3"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <Autocomplete
              items={customerItems}
              placeholder="Buscar cliente…"
              allowCreate
              onSelect={(item) => {
                setCustomerId(item.id)
                setCustomerName(item.label)
              }}
              onCreateNew={(q) => {
                setNewCustomerName(q)
                setShowNewCustomer(true)
              }}
            />
          )}
        </section>

        {/* Secao 2: Canal de venda */}
        <section className="space-y-2">
          <label className="label">Canal de venda</label>
          <div className="flex flex-wrap gap-2">
            {SALE_CHANNELS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setChannel(c.value)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-colors ${
                  channel === c.value
                    ? 'bg-green-700 text-white border-green-700'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </section>

        {/* Secao 3: Data de entrega */}
        <section className="space-y-2">
          <label className="label" htmlFor="delivery">Data de entrega (opcional)</label>
          <input
            id="delivery"
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="input"
          />
        </section>

        {/* Secao 4: Itens */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="label">Itens do pedido</label>
            {!showPaste && (
              <button
                type="button"
                onClick={() => setShowPaste(true)}
                className="text-sm font-semibold text-green-700 hover:text-green-900"
              >
                📋 Colar lista
              </button>
            )}
          </div>

          {showPaste && (
            <PasteImport
              species={speciesList}
              containers={containers}
              onImport={appendImported}
              onClose={() => setShowPaste(false)}
            />
          )}

          <div className="space-y-3">
            {items.map((it) => (
              <div
                key={it.key}
                className={`rounded-xl border-2 p-3 space-y-3 ${
                  it.is_generic ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleGeneric(it.key)}
                    title={it.is_generic ? 'Genérico (gerência escolhe)' : 'Espécie específica'}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      it.is_generic
                        ? 'bg-blue-600 text-white'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {it.is_generic ? 'GENÉRICO' : 'ESPECÍFICO'}
                  </button>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(it.key)}
                      className="text-red-600 font-bold text-sm px-2"
                    >
                      Remover
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    {it.is_generic ? (
                      <div className="input bg-gray-100 text-gray-500 flex items-center">
                        Gerência escolhe a espécie
                      </div>
                    ) : (
                      <Autocomplete
                        items={speciesItems}
                        placeholder="Buscar espécie…"
                        initialValue={it.species_label}
                        autoFocus={it.key === focusKey}
                        allowCreate
                        onSelect={(item) =>
                          updateItem(it.key, { species_id: item.id, species_label: item.label })
                        }
                        onCreateNew={(q) => handleQuickCreateSpecies(it.key, q)}
                      />
                    )}
                  </div>
                  <div className="sm:col-span-4">
                    <select
                      value={it.container_id}
                      onChange={(e) => updateItem(it.key, { container_id: e.target.value })}
                      className="input"
                    >
                      <option value="">
                        {it.is_generic ? 'Recipiente mínimo…' : 'Recipiente…'}
                      </option>
                      {containers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => updateItem(it.key, { quantity: e.target.value })}
                      placeholder="Qtd"
                      className="input"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addItem()
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm font-semibold text-gray-500 hover:border-green-500 hover:text-green-700 transition-colors"
          >
            + Adicionar item
          </button>
        </section>

        {/* Secao 5: Observacoes */}
        <section className="space-y-2">
          <label className="label" htmlFor="notes">Observações</label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas sobre o pedido…"
            className="input resize-none"
          />
        </section>

        {/* Acoes */}
        <div className="flex gap-3 pb-10">
          <Link href="/pedidos" className="btn-secondary text-center">
            Cancelar
          </Link>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? 'Cadastrando…' : 'Cadastrar Pedido'}
          </button>
        </div>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
