'use server'

import pool from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { can, type Actor } from '@/lib/permissions'
import {
  listParties,
  getPartyDetail,
  type PartyDetail,
  type PartyListRow,
  type PartyRole,
} from '@/lib/parties'
import { PESSOA_ROLES } from '@/lib/modules'

/**
 * Papeis que este usuario pode ler. Funcao PURA — a sessao entra por parametro.
 *
 * Existe porque a leitura nao e uniforme: `cliente:ler` e de chefia, gerencia e
 * admin, mas `fornecedor:ler` e so de chefia e admin (D4 §2). Uma lista unica
 * de pessoas sem este recorte faria a gerencia enxergar a rede de fornecedores
 * de graca.
 *
 * O `can()` fica repetido no corpo de cada action de proposito: guard escondido
 * atras de helper e invisivel para `authz-cobertura.test.ts`, e foi assim que o
 * `registrarUso` passou anos sem checagem de papel.
 */
function papeisLegiveis(user: Actor): PartyRole[] {
  return PESSOA_ROLES.filter((p) => can(user, p.readPermission)).map((p) => p.role)
}

/**
 * Lista as pessoas por identidade, opcionalmente filtrando por um papel.
 *
 * O `role` vem da tela e por isso e tratado como pedido, nao como autorizacao:
 * ele so pode ESTREITAR a lista de papeis legiveis. Pedir `fornecedor` sem ter
 * `fornecedor:ler` devolve vazio, nunca a rede inteira.
 */
export async function getPeople(search?: string, role?: PartyRole): Promise<PartyListRow[]> {
  const user = await requireAuth()
  const legiveis = PESSOA_ROLES.filter((p) => can(user, p.readPermission)).map((p) => p.role)

  const alvo = role ? legiveis.filter((r) => r === role) : legiveis
  if (alvo.length === 0) return []

  return listParties(pool, { roles: alvo, search: search ?? null })
}

/** Uma pessoa pelo id. `null` tambem quando ela existe mas nenhum papel dela e legivel. */
export async function getPerson(id: string): Promise<PartyDetail | null> {
  const user = await requireAuth()
  const legiveis = PESSOA_ROLES.filter((p) => can(user, p.readPermission)).map((p) => p.role)

  if (legiveis.length === 0) return null
  return getPartyDetail(pool, id, { roles: legiveis })
}

/** Os filtros que a tela pode mostrar — os mesmos papeis que ela pode ler. */
export async function getVisibleRoles(): Promise<PartyRole[]> {
  const user = await requireAuth()
  return papeisLegiveis(user)
}

/** Um pedido no histórico da pessoa. Sem valor: `order_items` não tem preço. */
export interface OrderSummary {
  id: string
  order_number: number
  status: string
  delivery_date: string | null
  created_at: string
  /** Soma das mudas do pedido — o que dá para medir hoje. */
  quantity: number
}

/** Uma cotação enviada à pessoa. Valor é o cotado, não o pago. */
export interface QuoteSummary {
  id: string
  created_at: string
  status: string
  items: number
  chosen: number
  /** Total cotado nos itens escolhidos; NULL quando o fornecedor não respondeu preço. */
  chosen_total: number | null
}

/**
 * O que compramos e o que vendemos para esta pessoa — na medida em que o
 * sistema sabe hoje, que e QUANTIDADE, nao valor.
 *
 * `order_items` nao tem coluna de preco e `orders` nao tem total: o pedido
 * registra o que saiu, nao por quanto. O valor so aparece quando
 * `financeiro.transactions` existir (P12 Fase 2), e vira de la — do extrato —
 * apontando para esta mesma `party_id`. Ate la a ficha mostra volume e diz o
 * que falta, em vez de inventar um numero.
 */
export async function getPartyHistory(id: string): Promise<{
  orders: OrderSummary[]
  quotes: QuoteSummary[]
}> {
  const user = await requireAuth()
  const legiveis = PESSOA_ROLES.filter((p) => can(user, p.readPermission)).map((p) => p.role)

  const vazio = { orders: [], quotes: [] }
  if (legiveis.length === 0) return vazio

  // O historico segue a mesma regra dos selos: quem nao le fornecedor nao ve as
  // cotacoes, mesmo abrindo a ficha de alguem que tem os dois papeis.
  const podeVenda = legiveis.includes('cliente')
  const podeCompra = legiveis.includes('fornecedor')

  const orders = podeVenda
    ? (
        await pool.query(
          `SELECT o.id, o.order_number, o.status, o.delivery_date, o.created_at,
                  COALESCE(SUM(i.quantity), 0)::int AS quantity
             FROM orders o
             JOIN customers c ON c.id = o.customer_id AND c.party_id = $1
             LEFT JOIN order_items i ON i.order_id = o.id AND NOT i.is_generic
            WHERE o.status <> 'cancelado'
            GROUP BY o.id, o.order_number, o.status, o.delivery_date, o.created_at
            ORDER BY o.created_at DESC
            LIMIT 20`,
          [id],
        )
      ).rows
    : []

  const quotes = podeCompra
    ? (
        await pool.query(
          `SELECT q.id, q.created_at, q.status,
                  COUNT(i.id)::int                                   AS items,
                  COUNT(i.id) FILTER (WHERE i.is_chosen)::int        AS chosen,
                  SUM(i.quoted_unit_price * i.quantity)
                    FILTER (WHERE i.is_chosen)                       AS chosen_total
             FROM supplier_quotes q
             JOIN suppliers s ON s.id = q.supplier_id AND s.party_id = $1
             LEFT JOIN supplier_quote_items i ON i.quote_id = q.id
            GROUP BY q.id, q.created_at, q.status
            ORDER BY q.created_at DESC
            LIMIT 20`,
          [id],
        )
      ).rows
    : []

  return {
    orders: orders as unknown as OrderSummary[],
    quotes: quotes as unknown as QuoteSummary[],
  }
}
