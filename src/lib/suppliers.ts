// Tipos, constantes e helpers puros do dominio de Fornecedores (P11).
// Espelha src/lib/customers.ts: fora de qualquer arquivo 'use server' para ser
// importado por Server Actions e Client Components, e testado isoladamente.

export type SupplierStatus = 'lead' | 'active' | 'inactive' | 'do_not_contact'
export type SupplierAvailability = 'in_stock' | 'on_order' | 'unknown'
export type SupplierSpeciesSource = 'manual' | 'paste' | 'quote'

export const SUPPLIER_STATUSES: SupplierStatus[] = [
  'lead',
  'active',
  'inactive',
  'do_not_contact',
]

// Rotulos e badges (Tailwind) por status — padrao ORDER_STATUS_META de lib/orders.ts.
export const SUPPLIER_STATUS_META: Record<
  SupplierStatus,
  { label: string; badge: string; hint: string }
> = {
  lead: {
    label: 'Novo contato',
    badge: 'bg-blue-100 text-blue-800',
    hint: 'Ainda não compramos dele',
  },
  active: {
    label: 'Parceiro',
    badge: 'bg-green-100 text-green-800',
    hint: 'Fornecedor ativo da rede',
  },
  inactive: {
    label: 'Inativo',
    badge: 'bg-gray-100 text-gray-600',
    hint: 'Parou de vender; histórico mantido',
  },
  do_not_contact: {
    label: 'Não contatar',
    badge: 'bg-red-100 text-red-700',
    hint: 'Pediu para não ser contatado',
  },
}

export const AVAILABILITY_META: Record<
  SupplierAvailability,
  { label: string; badge: string }
> = {
  in_stock: { label: 'Em estoque', badge: 'bg-green-100 text-green-800' },
  on_order: { label: 'Sob encomenda', badge: 'bg-amber-100 text-amber-800' },
  unknown: { label: 'Não sei', badge: 'bg-gray-100 text-gray-500' },
}

export interface SupplierInput {
  name?: string | null
  contact_name?: string | null
  whatsapp?: string | null
  phone?: string | null
  email?: string | null
  instagram?: string | null
  city?: string | null
  state?: string | null
  notes?: string | null
  reliability_score?: number | null
  status?: SupplierStatus | null
}

export interface SupplierSpeciesInput {
  species_id?: string | null
  size?: string | null
  container?: string | null
  unit_price?: number | null
  min_quantity?: number | null
  availability?: SupplierAvailability | null
  notes?: string | null
}

/** status invalido (ex.: '' vindo do form) vira 'lead' (default do banco). */
export function normalizeSupplierStatus(v: string | null | undefined): SupplierStatus {
  return (SUPPLIER_STATUSES as string[]).includes(v ?? '') ? (v as SupplierStatus) : 'lead'
}

/** availability invalida vira 'unknown' (default do banco). */
export function normalizeAvailability(
  v: string | null | undefined,
): SupplierAvailability {
  return v === 'in_stock' || v === 'on_order' ? v : 'unknown'
}

/** reliability_score fora de 0..5 (ou nao numerico) vira null. */
export function normalizeReliabilityScore(v: number | null | undefined): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  const n = Math.round(v)
  return n >= 0 && n <= 5 ? n : null
}

/** Cadastro de fornecedor: so o nome e obrigatorio. Retorna mensagem ou null. */
export function validateSupplier(data: { name?: string | null }): string | null {
  if (!data.name?.trim()) return 'Nome do fornecedor é obrigatório.'
  return null
}

/** Item de especie do fornecedor: precisa de especie; preco/qtd nao podem ser negativos. */
export function validateSupplierSpecies(data: SupplierSpeciesInput): string | null {
  if (!data.species_id) return 'Escolha a espécie.'
  if (data.unit_price != null && !(data.unit_price >= 0)) return 'Preço inválido.'
  if (data.min_quantity != null && !(data.min_quantity > 0)) return 'Quantidade mínima inválida.'
  return null
}

/**
 * Preco BR para exibicao: 4.5 -> "R$ 4,50".
 *
 * @deprecated Use `formatBRL` de `@/lib/format`. Mantido como alias porque e
 * usado em 5 telas de fornecedores/cotacoes; a implementacao ja e a de la, entao
 * nao existem mais duas formatacoes de moeda no projeto — so dois nomes.
 */
export { formatBRL as formatPriceBR } from './format'
