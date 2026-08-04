'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import ChartCard from '@/components/charts/ChartCard'
import StatTile from '@/components/charts/StatTile'
import { COR, CROMO, EIXO_PROPS, GRADE_PROPS, STATUS } from '@/components/charts/palette'
import { formatBRL, formatBRLInteiro, formatCompactBRL, formatDateBR, formatPct } from '@/lib/format'
import type { ClientesData } from '../queries'

/**
 * Recencia por icone + rotulo, nunca so cor: `atencao` fica abaixo de 3:1 no
 * branco de proposito, e cor sozinha nao e canal acessivel.
 */
function statusRecencia(dias: number | null) {
  if (dias == null) return { rotulo: 'sem data', icone: '·', cor: CROMO.tintaMuda }
  if (dias <= 180) return { rotulo: 'ativo', icone: '●', cor: STATUS.bom }
  if (dias <= 365) return { rotulo: 'esfriando', icone: '◐', cor: STATUS.atencao }
  return { rotulo: 'parado', icone: '○', cor: STATUS.critico }
}

export default function ClientesView({ data }: { data: ClientesData }) {
  const router = useRouter()

  const top20 = useMemo(
    () => data.clientes.slice(0, 20).map((c) => ({
      nome: c.nome.length > 26 ? `${c.nome.slice(0, 24)}…` : c.nome,
      nomeCompleto: c.nome,
      valor: c.receita,
    })),
    [data.clientes],
  )

  // Curva ABC: % acumulado da receita conforme se desce no ranking.
  const abc = useMemo(() => {
    const total = data.receitaTotal
    if (total <= 0) return []
    let acumulado = 0
    return data.clientes.map((c, i) => {
      acumulado += c.receita
      return {
        rank: i + 1,
        pctAcumulado: Math.round((acumulado / total) * 1000) / 10,
      }
    })
  }, [data.clientes, data.receitaTotal])

  // Quantos clientes fazem 80% da receita — o número que resume a concentração.
  const clientes80 = useMemo(
    () => abc.find((p) => p.pctAcumulado >= 80)?.rank ?? null,
    [abc],
  )

  const pctTop20 = data.receitaTotal > 0
    ? (data.clientes.slice(0, 20).reduce((s, c) => s + c.receita, 0) / data.receitaTotal) * 100
    : null

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <label htmlFor="ano" className="text-xs font-semibold text-gray-600">Ano</label>
        <select
          id="ano" className="input py-1.5 w-auto"
          value={data.ano ?? ''}
          onChange={(e) =>
            router.push(e.target.value ? `/financeiro/clientes?ano=${e.target.value}` : '/financeiro/clientes')
          }
        >
          <option value="">todos</option>
          {data.anos.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile rotulo="Clientes" valor={data.clientes.length.toLocaleString('pt-BR')} />
        <StatTile rotulo="Receita" valor={formatBRLInteiro(data.receitaTotal)} />
        <StatTile
          rotulo="Top 20 concentram"
          valor={formatPct(pctTop20)}
          nota="da receita do período"
        />
        <StatTile
          rotulo="80% da receita"
          valor={clientes80 != null ? `${clientes80} clientes` : '—'}
          nota={
            clientes80 != null && data.clientes.length > 0
              ? `${formatPct((clientes80 / data.clientes.length) * 100, 0)} da carteira`
              : undefined
          }
        />
      </div>

      {/* ABC em grafico proprio, NAO sobreposto as barras: escalas diferentes
          (R$ e %) num plot so viraria grafico de dois eixos. */}
      <ChartCard
        titulo="Curva ABC"
        subtitulo="Quantos clientes acumulam quanto da receita"
      >
        {abc.length === 0 ? (
          <p className="text-xs text-gray-400 py-8 text-center">Sem vendas no período.</p>
        ) : (
          <div className="h-48 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={abc} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid {...GRADE_PROPS} />
                <XAxis
                  dataKey="rank" {...EIXO_PROPS}
                  label={{ value: 'clientes (ranking)', position: 'insideBottom', offset: -2, fontSize: 10, fill: CROMO.tintaMuda }}
                />
                <YAxis {...EIXO_PROPS} width={40} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const p = payload[0].payload as { rank: number; pctAcumulado: number }
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-md px-2.5 py-2 text-xs">
                        <p className="text-gray-700">
                          Os <strong>{p.rank}</strong> maiores clientes fazem{' '}
                          <strong className="tabular-nums">{formatPct(p.pctAcumulado)}</strong> da receita
                        </p>
                      </div>
                    )
                  }}
                />
                <ReferenceLine y={80} stroke={CROMO.eixo} strokeWidth={1} />
                <Line
                  type="monotone" dataKey="pctAcumulado"
                  stroke={COR.padrao} strokeWidth={2} dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard
        titulo="Top 20 clientes por receita"
        tabela={{
          colunas: [
            { chave: 'cliente', rotulo: 'Cliente' },
            { chave: 'notas', rotulo: 'Notas', numerica: true },
            { chave: 'receita', rotulo: 'Receita', numerica: true },
          ],
          linhas: data.clientes.slice(0, 20).map((c) => ({
            cliente: c.nome,
            notas: String(c.notas),
            receita: formatBRLInteiro(c.receita),
          })),
        }}
      >
        {top20.length === 0 ? (
          <p className="text-xs text-gray-400 py-8 text-center">Sem vendas no período.</p>
        ) : (
          <div style={{ height: Math.max(200, top20.length * 26) }} className="-ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top20} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid {...GRADE_PROPS} horizontal={false} vertical />
                <XAxis type="number" {...EIXO_PROPS} tickFormatter={(v) => formatCompactBRL(v)} />
                <YAxis
                  type="category" dataKey="nome" {...EIXO_PROPS}
                  width={140} tick={{ fill: CROMO.tintaSecundaria, fontSize: 9 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const p = payload[0]
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-md px-2.5 py-2 text-xs max-w-56">
                        <p className="font-semibold text-gray-800 break-words">
                          {(p.payload as { nomeCompleto: string }).nomeCompleto}
                        </p>
                        <p className="text-gray-600 tabular-nums">{formatBRL(p.value as number)}</p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="valor" fill={COR.padrao} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <h2 className="text-sm font-bold text-gray-800">Recência</h2>
        <p className="text-xs text-gray-500 mt-0.5 mb-2">
          Há quanto tempo cada cliente não compra. Ativo = até 6 meses.
        </p>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 px-1 font-semibold text-gray-600">Cliente</th>
                <th className="text-left py-1.5 px-1 font-semibold text-gray-600">Situação</th>
                <th className="text-left py-1.5 px-1 font-semibold text-gray-600">Última compra</th>
                <th className="text-right py-1.5 px-1 font-semibold text-gray-600">Receita</th>
              </tr>
            </thead>
            <tbody>
              {data.clientes.slice(0, 50).map((c, i) => {
                const s = statusRecencia(c.dias_sem_comprar)
                return (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-1.5 px-1 text-gray-700 max-w-40 truncate" title={c.nome}>
                      {c.nome}
                    </td>
                    <td className="py-1.5 px-1 whitespace-nowrap">
                      <span style={{ color: s.cor }} aria-hidden="true">{s.icone}</span>{' '}
                      <span className="text-gray-600">{s.rotulo}</span>
                    </td>
                    <td className="py-1.5 px-1 text-gray-500 whitespace-nowrap">
                      {formatDateBR(c.ultima_compra)}
                      {c.dias_sem_comprar != null && (
                        <span className="text-gray-400"> · {c.dias_sem_comprar}d</span>
                      )}
                    </td>
                    <td className="py-1.5 px-1 text-right text-gray-700 tabular-nums">
                      {formatBRLInteiro(c.receita)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
