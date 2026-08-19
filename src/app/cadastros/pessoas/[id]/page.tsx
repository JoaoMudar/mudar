import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAnyPermission } from '@/lib/authz'
import { can } from '@/lib/permissions'
import { PESSOA_ROLES } from '@/lib/modules'
import { PARTY_ROLE_LABEL } from '@/lib/parties'
import { getPerson, getPartyHistory } from '../actions'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  cadastrado: 'cadastrado',
  verificando_disponibilidade: 'verificando',
  verificado: 'verificado',
  pendente_alteracao: 'pendente de alteração',
  aprovado: 'aprovado',
  separando: 'separando',
  pronto_envio: 'pronto para envio',
  queued: 'na fila',
  sent: 'enviada',
  responded: 'respondida',
  no_reply: 'sem resposta',
  cancelled: 'cancelada',
}

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—')

const reais = (v: number | null) =>
  v === null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default async function PessoaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireAnyPermission(PESSOA_ROLES.map((p) => p.readPermission))

  const pessoa = await getPerson(id)
  if (!pessoa) notFound()

  const { orders, quotes } = await getPartyHistory(id)

  const telaDoPapel = new Map(
    PESSOA_ROLES.filter((p) => can(user, p.readPermission)).map((p) => [p.role, p.href] as const),
  )

  const mudasVendidas = orders.reduce((t, o) => t + o.quantity, 0)
  const cotadoEscolhido = quotes.reduce((t, q) => t + Number(q.chosen_total ?? 0), 0)

  const identificacao = [
    pessoa.kind === 'pj' ? 'Pessoa jurídica' : pessoa.kind === 'pf' ? 'Pessoa física' : null,
    pessoa.document,
    pessoa.city && pessoa.state ? `${pessoa.city}/${pessoa.state}` : pessoa.city,
    pessoa.whatsapp || pessoa.phone,
    pessoa.email,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      <Link href="/cadastros/pessoas" className="text-sm text-green-700">
        ← Pessoas
      </Link>

      <header>
        <h2 className="text-xl font-bold text-gray-900">{pessoa.name}</h2>
        <p className="text-sm text-gray-500">{identificacao || 'sem dados de contato'}</p>

        {/* Os papeis desta identidade. Cada um leva a tela onde se editam os
            campos daquele papel — dados fiscais no cliente; especies e mapa no
            fornecedor. Aqui nao se edita nada: esta ficha e a identidade. */}
        <div className="flex flex-wrap gap-2 mt-3">
          {pessoa.roles.map((role) => {
            const href = telaDoPapel.get(role) ?? null
            const rotulo = PARTY_ROLE_LABEL[role] ?? role
            const classe = 'text-xs px-2 py-1 rounded-full border font-medium'
            return href ? (
              <Link
                key={role}
                href={href}
                className={`${classe} border-green-600 text-green-700 active:bg-green-50`}
              >
                {rotulo} →
              </Link>
            ) : (
              <span key={role} className={`${classe} border-gray-300 text-gray-500`}>
                {rotulo}
              </span>
            )
          })}
        </div>
      </header>

      {/* O QUE ESTA FICHA AINDA NAO RESPONDE.
          "Quanto compramos e quanto vendemos para esta pessoa" so tem resposta
          em dinheiro quando `financeiro.transactions` existir (P12 Fase 2): e de
          la, do extrato, que o valor vem — apontando para esta mesma party_id.
          `order_items` nao tem coluna de preco e `orders` nao tem total, entao
          por ora o que se mede e VOLUME. O aviso fica visivel de proposito: um
          numero inventado seria pior que um numero ausente. */}
      <section className="grid grid-cols-2 gap-3">
        <Totalizador
          titulo="Vendemos"
          valor={orders.length > 0 ? `${mudasVendidas.toLocaleString('pt-BR')} mudas` : '—'}
          nota={`${orders.length} ${orders.length === 1 ? 'pedido' : 'pedidos'}`}
          visivel={telaDoPapel.has('cliente')}
        />
        <Totalizador
          titulo="Compramos"
          valor={cotadoEscolhido > 0 ? reais(cotadoEscolhido) : '—'}
          nota={
            cotadoEscolhido > 0
              ? 'cotado e escolhido, não pago'
              : `${quotes.length} ${quotes.length === 1 ? 'cotação' : 'cotações'}`
          }
          visivel={telaDoPapel.has('fornecedor')}
        />
      </section>

      <p className="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-3">
        <strong>O valor em reais ainda não está aqui.</strong> O pedido registra o que saiu, não
        por quanto — não há preço em <code>order_items</code>. O quanto se compra e o quanto se
        vende passa a ser somado por pessoa quando o Financeiro existir, a partir do extrato
        bancário (P12 Fase 2). Até lá, a venda é volume e a compra é o valor <em>cotado</em>, não o
        pago.
      </p>

      {telaDoPapel.has('cliente') && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            Pedidos
          </h3>
          {orders.length === 0 ? (
            <Vazio>Nenhum pedido.</Vazio>
          ) : (
            <ul className="space-y-2">
              {orders.map((o) => (
                <li
                  key={o.id}
                  className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-gray-900">Pedido #{o.order_number}</p>
                    <p className="text-sm text-gray-500">
                      {data(o.created_at)} · {STATUS_LABEL[o.status] ?? o.status}
                      {o.delivery_date ? ` · entrega ${data(o.delivery_date)}` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    {o.quantity.toLocaleString('pt-BR')} mudas
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {telaDoPapel.has('fornecedor') && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            Cotações
          </h3>
          {quotes.length === 0 ? (
            <Vazio>Nenhuma cotação enviada.</Vazio>
          ) : (
            <ul className="space-y-2">
              {quotes.map((q) => (
                <li
                  key={q.id}
                  className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {data(q.created_at)} · {STATUS_LABEL[q.status] ?? q.status}
                    </p>
                    <p className="text-sm text-gray-500">
                      {q.items} {q.items === 1 ? 'item' : 'itens'}
                      {q.chosen > 0 ? ` · ${q.chosen} escolhido(s)` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    {reais(q.chosen_total)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

function Totalizador({
  titulo,
  valor,
  nota,
  visivel,
}: {
  titulo: string
  valor: string
  nota: string
  visivel: boolean
}) {
  // Papel que o usuario nao pode ler nao aparece nem como caixa vazia: uma
  // caixa "Compramos —" ja contaria que esta pessoa e fornecedor.
  if (!visivel) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{titulo}</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{valor}</p>
      <p className="text-xs text-gray-500">{nota}</p>
    </div>
  )
}

function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-3">
      {children}
    </p>
  )
}
