// Tipos, constantes e helpers puros do dominio de Pedidos.
// Mantido fora de qualquer arquivo 'use server' para poder ser importado
// tanto por Server Actions quanto por Client Components, e testado isoladamente.

export type SaleChannel =
  | 'atacado'
  | 'compensacao_ambiental'
  | 'paisagismo'
  | 'prefeitura'
  | 'varejo'

export type OrderStatus =
  | 'cadastrado'
  | 'verificando_disponibilidade'
  | 'verificado'
  | 'pendente_alteracao'
  | 'aprovado'
  | 'separando'
  | 'pronto_envio'
  | 'cancelado'

export type LoadStatus = 'pendente' | 'separando' | 'pronto'

export const SALE_CHANNELS: { value: SaleChannel; label: string }[] = [
  { value: 'atacado', label: 'Atacado' },
  { value: 'compensacao_ambiental', label: 'Compensação Ambiental' },
  { value: 'paisagismo', label: 'Paisagismo' },
  { value: 'prefeitura', label: 'Prefeitura' },
  { value: 'varejo', label: 'Varejo' },
]

export const SALE_CHANNEL_LABEL: Record<SaleChannel, string> = {
  atacado: 'Atacado',
  compensacao_ambiental: 'Compensação Ambiental',
  paisagismo: 'Paisagismo',
  prefeitura: 'Prefeitura',
  varejo: 'Varejo',
}

// Rotulo + classes de badge (Tailwind) para cada status.
export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; badge: string }
> = {
  cadastrado: { label: 'Cadastrado', badge: 'bg-blue-100 text-blue-800' },
  verificando_disponibilidade: {
    label: 'Verificando',
    badge: 'bg-orange-100 text-orange-800',
  },
  verificado: { label: 'Verificado', badge: 'bg-yellow-100 text-yellow-800' },
  pendente_alteracao: {
    label: 'Pendente alteração',
    badge: 'bg-red-100 text-red-800',
  },
  aprovado: { label: 'Aprovado', badge: 'bg-green-100 text-green-800' },
  separando: { label: 'Separando', badge: 'bg-purple-100 text-purple-800' },
  pronto_envio: {
    label: 'Pronto p/ envio',
    badge: 'bg-emerald-200 text-emerald-900',
  },
  cancelado: { label: 'Cancelado', badge: 'bg-gray-100 text-gray-600' },
}

// --- Tipos de payload ---

export interface OrderItemInput {
  species_id: string | null
  container_id: string
  quantity: number
  is_generic: boolean
}

export interface CreateOrderInput {
  customer_id: string
  sale_channel: SaleChannel
  delivery_date: string | null
  notes: string
  items: OrderItemInput[]
}

export interface SpeciesAssignment {
  species_id: string
  container_id: string
  quantity: number
}

// --- Helpers puros (testaveis) ---

/**
 * Valida os itens de um pedido no momento do cadastro.
 * Regras: pelo menos 1 item, quantidade > 0, item especifico exige especie,
 * item generico nao pode ter especie.
 * Retorna mensagem de erro ou null se valido.
 */
export function validateOrderItems(items: OrderItemInput[]): string | null {
  if (!items || items.length === 0) {
    return 'Adicione pelo menos um item ao pedido.'
  }
  for (const item of items) {
    if (!item.container_id) {
      return 'Selecione o recipiente de todos os itens.'
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      return 'A quantidade de cada item deve ser maior que zero.'
    }
    if (item.is_generic && item.species_id) {
      return 'Item genérico não pode ter espécie definida.'
    }
    if (!item.is_generic && !item.species_id) {
      return 'Item específico precisa de uma espécie.'
    }
  }
  return null
}

/** Soma as quantidades de uma lista de atribuicoes/itens. */
export function sumQuantities(items: { quantity: number }[]): number {
  return items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)
}

/**
 * Valida a atribuicao de especies a um item generico.
 * - soma das quantidades deve ser igual a quantidade do item pai
 * - cada container atribuido deve ter volume >= volume do container minimo
 * `containerVolumes` mapeia container_id -> volume_liters (null tratado como 0).
 */
export function validateGenericAssignment(
  parentQuantity: number,
  minContainerVolume: number,
  assignments: SpeciesAssignment[],
  containerVolumes: Record<string, number | null>,
): string | null {
  if (!assignments || assignments.length === 0) {
    return 'Atribua pelo menos uma espécie.'
  }
  for (const a of assignments) {
    if (!a.species_id) return 'Selecione a espécie de cada linha.'
    if (!a.container_id) return 'Selecione o recipiente de cada linha.'
    if (!Number.isFinite(a.quantity) || a.quantity <= 0) {
      return 'A quantidade de cada espécie deve ser maior que zero.'
    }
    const vol = containerVolumes[a.container_id] ?? 0
    if (vol < minContainerVolume) {
      return 'O recipiente escolhido é menor que o mínimo do pedido.'
    }
  }
  const total = sumQuantities(assignments)
  if (total !== parentQuantity) {
    return `A soma (${total}) deve ser igual ao total do item (${parentQuantity}).`
  }
  return null
}

/**
 * Valida a divisao de um pedido em cargas.
 * `originalQuantities` mapeia order_item_id -> quantidade total do item.
 * `loads` eh a lista de cargas, cada uma com itens {order_item_id, quantity}.
 * A soma por item across cargas deve ser igual a quantidade original.
 */
export function validateLoadsSplit(
  originalQuantities: Record<string, number>,
  loads: { items: { order_item_id: string; quantity: number }[] }[],
): string | null {
  const totals: Record<string, number> = {}
  for (const load of loads) {
    for (const item of load.items) {
      if (item.quantity < 0) return 'Quantidade não pode ser negativa.'
      totals[item.order_item_id] =
        (totals[item.order_item_id] ?? 0) + (Number(item.quantity) || 0)
    }
  }
  for (const [itemId, expected] of Object.entries(originalQuantities)) {
    const got = totals[itemId] ?? 0
    if (got !== expected) {
      return `A soma das cargas (${got}) não bate com o total do item (${expected}).`
    }
  }
  return null
}
