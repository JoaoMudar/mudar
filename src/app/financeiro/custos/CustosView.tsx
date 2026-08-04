'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import ChartCard from '@/components/charts/ChartCard'
import { COR, CROMO, EIXO_PROPS, GRADE_PROPS } from '@/components/charts/palette'
import { formatBRL, formatBRLInteiro, formatCompactBRL, formatPct } from '@/lib/format'
import type { CustosData } from '../queries'

type Visao = 'negocio' | 'pessoal' | 'total'

const VISOES: { chave: Visao; rotulo: string }[] = [
  { chave: 'negocio', rotulo: 'Negócio' },
  { chave: 'pessoal', rotulo: 'Pessoal' },
  { chave: 'total',   rotulo: 'Total' },
]

/** Acima de 7 fatias as cores adjacentes borram: o resto vira "Outros". */
const MAX_GRUPOS = 7

export default function CustosView({ data }: { data: CustosData }) {
  const router = useRouter()
  const [visao, setVisao] = useState<Visao>('negocio')

  function valorDe(o: { valor: number; valor_negocio: number; valor_pessoal?: number }): number {
    if (visao === 'negocio') return o.valor_negocio
    if (visao === 'pessoal') return o.valor_pessoal ?? o.valor - o.valor_negocio
    return o.valor
  }

  const grupos = useMemo(() => {
    const ordenados = data.grupos
      .map((g) => ({ nome: g.grupo, valor: valorDe(g) }))
      .filter((g) => g.valor > 0)
      .sort((a, b) => b.valor - a.valor)

    if (ordenados.length <= MAX_GRUPOS) return ordenados
    const principais = ordenados.slice(0, MAX_GRUPOS)
    const resto = ordenados.slice(MAX_GRUPOS).reduce((s, g) => s + g.valor, 0)
    return resto > 0 ? [...principais, { nome: 'Outros', valor: resto }] : principais
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.grupos, visao])

  const total = useMemo(() => grupos.reduce((s, g) => s + g.valor, 0), [grupos])

  const centros = useMemo(
    () => data.centros
      .map((c) => ({ nome: c.centro_custo ?? 'Sem centro', valor: valorDe(c) }))
      .filter((c) => c.valor > 0)
      .sort((a, b) => b.valor - a.valor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.centros, visao],
  )

  const categorias = useMemo(
    () => data.categorias
      .map((c) => ({ ...c, mostrado: valorDe(c) }))
      .filter((c) => c.mostrado > 0)
      .sort((a, b) => b.mostrado - a.mostrado),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.categorias, visao],
  )

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="ano" className="text-xs font-semibold text-gray-600">Ano</label>
          <select
            id="ano" className="input py-1.5 w-auto" value={data.ano}
            onChange={(e) => router.push(`/financeiro/custos?ano=${e.target.value}`)}
          >
            {data.anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Substitui o filtro vazado por natureza da linha: agora a separacao
            vem da categoria + rateio, e da para ver os tres recortes. */}
        <div className="flex gap-1">
          {VISOES.map((v) => (
            <button
              key={v.chave}
              type="button"
              onClick={() => setVisao(v.chave)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                visao === v.chave
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {v.rotulo}
            </button>
          ))}
        </div>
      </div>

      <ChartCard
        titulo={`Custo por grupo — ${data.ano}`}
        subtitulo={`${VISOES.find((v) => v.chave === visao)!.rotulo} · total ${formatBRLInteiro(total)}`}
        tabela={{
          colunas: [
            { chave: 'grupo', rotulo: 'Grupo' },
            { chave: 'valor', rotulo: 'Valor', numerica: true },
            { chave: 'pct', rotulo: '%', numerica: true },
          ],
          linhas: grupos.map((g) => ({
            grupo: g.nome,
            valor: formatBRLInteiro(g.valor),
            pct: formatPct(total > 0 ? (g.valor / total) * 100 : null),
          })),
        }}
      >
        {/* Barra horizontal: nome de grupo e longo e nao cabe deitado. */}
        <div style={{ height: Math.max(160, grupos.length * 34) }} className="-ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={grupos} layout="vertical"
              margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
            >
              <CartesianGrid {...GRADE_PROPS} horizontal={false} vertical />
              <XAxis type="number" {...EIXO_PROPS} tickFormatter={(v) => formatCompactBRL(v)} />
              <YAxis
                type="category" dataKey="nome" {...EIXO_PROPS}
                width={128} tick={{ fill: CROMO.tintaSecundaria, fontSize: 10 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0]
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-2.5 py-2 text-xs">
                      <p className="font-semibold text-gray-800">{p.payload.nome}</p>
                      <p className="text-gray-600 tabular-nums">{formatBRL(p.value as number)}</p>
                    </div>
                  )
                }}
              />
              {/* Categoria nominal => UMA cor. Escurecer por valor duplicaria
                  o que o comprimento da barra ja diz. */}
              <Bar dataKey="valor" fill={COR.padrao} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        titulo={`Centro de custo — ${data.ano}`}
        subtitulo="Viveiro em destaque; o resto é contexto"
        aviso={
          visao === 'total'
            ? 'No total, Casa costuma ser o maior balde — é gasto da família, não do viveiro. Use a visão "Negócio" para o custo da empresa.'
            : undefined
        }
        tabela={{
          colunas: [
            { chave: 'centro', rotulo: 'Centro' },
            { chave: 'valor', rotulo: 'Valor', numerica: true },
          ],
          linhas: centros.map((c) => ({ centro: c.nome, valor: formatBRLInteiro(c.valor) })),
        }}
      >
        <div style={{ height: Math.max(140, centros.length * 34) }} className="-ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={centros} layout="vertical"
              margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
            >
              <CartesianGrid {...GRADE_PROPS} horizontal={false} vertical />
              <XAxis type="number" {...EIXO_PROPS} tickFormatter={(v) => formatCompactBRL(v)} />
              <YAxis
                type="category" dataKey="nome" {...EIXO_PROPS}
                width={96} tick={{ fill: CROMO.tintaSecundaria, fontSize: 10 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-2.5 py-2 text-xs">
                      <p className="font-semibold text-gray-800">{payload[0].payload.nome}</p>
                      <p className="text-gray-600 tabular-nums">
                        {formatBRL(payload[0].value as number)}
                      </p>
                    </div>
                  )
                }}
              />
              {/* Enfase: o Viveiro colorido, o resto cinza — a comparacao e
                  "quanto do gasto e do viveiro", nao "identifique 7 centros". */}
              <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                {centros.map((c) => (
                  <Cell key={c.nome} fill={c.nome === 'Viveiro' ? COR.padrao : '#cfcfca'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <h2 className="text-sm font-bold text-gray-800 mb-2">
          Categorias — {data.ano}
        </h2>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 px-1 font-semibold text-gray-600">Categoria</th>
                <th className="text-left py-1.5 px-1 font-semibold text-gray-600">Grupo</th>
                <th className="text-right py-1.5 px-1 font-semibold text-gray-600">Valor</th>
                <th className="text-right py-1.5 px-1 font-semibold text-gray-600">%</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-1.5 px-1 text-gray-700">{c.categoria ?? 'Sem categoria'}</td>
                  <td className="py-1.5 px-1 text-gray-400">{c.grupo ?? '—'}</td>
                  <td className="py-1.5 px-1 text-right text-gray-700 tabular-nums">
                    {formatBRLInteiro(c.mostrado)}
                  </td>
                  <td className="py-1.5 px-1 text-right text-gray-500 tabular-nums">
                    {formatPct(total > 0 ? (c.mostrado / total) * 100 : null)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
