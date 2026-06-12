import Link from 'next/link'
import { QUOTE_STATUS_META, responseRatePct, type QuoteStatus } from '@/lib/quotes'

export interface KanbanQuote {
  id: string
  request_group_id: string
  status: QuoteStatus
  created_at: string
  sent_at: string | null
  responded_at: string | null
  supplier_name: string
  order_number: number | null
  customer_name: string | null
  item_count: number
}

export interface DashboardTotals {
  responded: number
  outreach: number
  open_count: number
}

export interface TopSupplier {
  id: string
  name: string
  city: string | null
  state: string | null
  total_quotes: number
  responded_count: number
  outreach_count: number
}

export interface NetworkGap {
  id: string
  common_name: string
  quote_count: number
}

export interface DashboardData {
  kanban: KanbanQuote[]
  totals: DashboardTotals
  topSuppliers: TopSupplier[]
  networkGaps: NetworkGap[]
}

interface Props {
  data: DashboardData
}

const KANBAN_COLUMNS: QuoteStatus[] = ['queued', 'sent', 'responded', 'no_reply']

function fmtDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/**
 * Painel de cotacoes (P11 F5): visao geral do funil de outreach, fornecedores
 * mais usados (com taxa de resposta) e especies cotadas que a rede ainda nao
 * cobre. So leitura — as acoes continuam no acompanhamento de cotacoes.
 */
export default function DashboardView({ data }: Props) {
  const { kanban, totals, topSuppliers, networkGaps } = data
  const overallRate = responseRatePct(totals.responded, totals.outreach)

  const byStatus = new Map<QuoteStatus, KanbanQuote[]>(
    KANBAN_COLUMNS.map((status) => [status, []]),
  )
  for (const quote of kanban) {
    byStatus.get(quote.status)?.push(quote)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-4">
        <Link
          href="/fornecedores"
          className="text-sm text-green-300 hover:text-white mb-1 inline-block"
        >
          ← Fornecedores
        </Link>
        <h1 className="text-xl font-bold">Painel de cotações</h1>
      </header>

      <div className="p-4 max-w-3xl mx-auto space-y-4">
        {/* Numeros gerais */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{totals.open_count}</p>
            <p className="text-xs text-gray-500">Em aberto</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{totals.responded}</p>
            <p className="text-xs text-gray-500">Respondidas</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">
              {overallRate != null ? `${overallRate}%` : '—'}
            </p>
            <p className="text-xs text-gray-500">Taxa de resposta</p>
          </div>
        </div>

        {/* Kanban por status */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-gray-900 text-sm">Cotações por status</h2>
            <Link
              href="/fornecedores/cotacoes"
              className="text-xs font-semibold text-green-700"
            >
              Acompanhamento →
            </Link>
          </div>
          {kanban.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">
              Nenhuma cotação ainda. Comece pelo botão “💬 Orçamento” em Fornecedores.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {KANBAN_COLUMNS.map((status) => {
                const meta = QUOTE_STATUS_META[status]
                const quotes = byStatus.get(status) ?? []
                return (
                  <div
                    key={status}
                    className="min-w-[160px] w-[160px] shrink-0 bg-gray-50 rounded-lg p-2 space-y-1.5"
                  >
                    <p className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                      <span className="text-xs font-bold text-gray-500">{quotes.length}</span>
                    </p>
                    {quotes.slice(0, 6).map((q) => (
                      <Link
                        key={q.id}
                        href={
                          q.status === 'responded'
                            ? `/fornecedores/cotacoes/${q.request_group_id}`
                            : '/fornecedores/cotacoes'
                        }
                        className="block bg-white rounded-lg border border-gray-200 p-2"
                      >
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {q.supplier_name}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {q.order_number
                            ? `Pedido #${q.order_number}`
                            : 'Avulsa'}
                          {` · ${q.item_count} esp. · ${fmtDate(q.created_at)}`}
                        </p>
                      </Link>
                    ))}
                    {quotes.length > 6 && (
                      <p className="text-[11px] text-gray-400 text-center">
                        +{quotes.length - 6} mais
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Fornecedores mais usados */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 space-y-2">
          <h2 className="font-bold text-gray-900 text-sm">Fornecedores mais cotados</h2>
          {topSuppliers.length === 0 ? (
            <p className="text-gray-400 text-sm py-2 text-center">Sem cotações ainda.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {topSuppliers.map((s) => {
                const rate = responseRatePct(s.responded_count, s.outreach_count)
                return (
                  <li key={s.id} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/fornecedores/${s.id}`}
                        className="font-semibold text-gray-800 text-sm truncate block"
                      >
                        {s.name}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {s.city ? `${s.city}${s.state ? `/${s.state}` : ''} · ` : ''}
                        {s.total_quotes} cotação(ões)
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        rate == null
                          ? 'bg-gray-100 text-gray-400'
                          : rate >= 60
                            ? 'bg-green-100 text-green-800'
                            : rate >= 30
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {rate != null ? `responde ${rate}%` : 'sem envio'}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Gap de rede */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 space-y-2">
          <h2 className="font-bold text-gray-900 text-sm">Espécies sem fornecedor na rede</h2>
          <p className="text-xs text-gray-500">
            Já foram cotadas, mas nenhum fornecedor contatável as oferece — vale
            recrutar fornecedor novo para elas.
          </p>
          {networkGaps.length === 0 ? (
            <p className="text-gray-400 text-sm py-2 text-center">
              Nenhum gap: tudo que foi cotado tem fornecedor na rede. 🌱
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {networkGaps.map((gap) => (
                <span
                  key={gap.id}
                  className="text-xs font-semibold px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-100"
                >
                  {gap.common_name}
                  {gap.quote_count > 1 ? ` · ${gap.quote_count}x` : ''}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
