'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import ChartCard from '@/components/charts/ChartCard'
import {
  COR, CROMO, DIVERGENTE, EIXO_PROPS, GRADE_PROPS, corSequencial,
} from '@/components/charts/palette'
import { MESES_ABREV, formatBRL, formatBRLInteiro, formatCompactBRL } from '@/lib/format'
import type { MensalData } from '../queries'

function TooltipMoeda({ active, payload, label }: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string }[]
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-2.5 py-2 text-xs">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-gray-600">
          <span
            className="inline-block w-2 h-2 rounded-sm shrink-0"
            style={{ background: p.color }}
            aria-hidden="true"
          />
          {p.name}: <span className="font-semibold tabular-nums">{formatBRL(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

export default function MensalView({ data }: { data: MensalData }) {
  const [ano, setAno] = useState(() => data.anos[0] ?? new Date().getFullYear())

  const doAno = useMemo(
    () => MESES_ABREV.map((rotulo, i) => {
      const mes = i + 1
      const l = data.serie.find((s) => s.ano === ano && s.mes === mes)
      return {
        mes: rotulo,
        receita: l?.receita ?? 0,
        despesa: l?.despesa ?? 0,
        resultado: l?.resultado ?? 0,
      }
    }),
    [data.serie, ano],
  )

  // Heatmap: magnitude continua => uma matiz so, claro -> escuro.
  const heat = useMemo(() => {
    const max = Math.max(...data.serie.map((s) => s.receita), 0)
    const porAno = new Map<number, number[]>()
    for (const s of data.serie) {
      if (!porAno.has(s.ano)) porAno.set(s.ano, Array(12).fill(0))
      porAno.get(s.ano)![s.mes - 1] = s.receita
    }
    return {
      max,
      linhas: [...porAno.entries()].sort((a, b) => b[0] - a[0]),
    }
  }, [data.serie])

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      {/* Filtro acima de tudo que ele controla, nunca dentro de um card. */}
      <div className="flex items-center gap-2">
        <label htmlFor="ano" className="text-xs font-semibold text-gray-600">Ano</label>
        <select
          id="ano" className="input py-1.5 w-auto"
          value={ano} onChange={(e) => setAno(Number(e.target.value))}
        >
          {data.anos.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <ChartCard
        titulo={`Receita e despesa mês a mês — ${ano}`}
        subtitulo="Mês sem barra de despesa é mês por lançar"
        tabela={{
          colunas: [
            { chave: 'mes', rotulo: 'Mês' },
            { chave: 'receita', rotulo: 'Receita', numerica: true },
            { chave: 'despesa', rotulo: 'Despesa', numerica: true },
            { chave: 'resultado', rotulo: 'Resultado', numerica: true },
          ],
          linhas: doAno.map((d) => ({
            mes: d.mes,
            receita: formatBRLInteiro(d.receita),
            despesa: formatBRLInteiro(d.despesa),
            resultado: formatBRLInteiro(d.resultado),
          })),
        }}
      >
        <div className="h-56 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={doAno} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid {...GRADE_PROPS} />
              <XAxis dataKey="mes" {...EIXO_PROPS} />
              <YAxis {...EIXO_PROPS} tickFormatter={(v) => formatCompactBRL(v)} width={62} />
              <Tooltip content={<TooltipMoeda />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              {/* Duas series no maximo por grafico, mesma unidade, um eixo. */}
              <Line
                type="monotone" dataKey="receita" name="Receita"
                stroke={COR.receita} strokeWidth={2}
                dot={{ r: 3, fill: COR.receita, stroke: CROMO.superficie, strokeWidth: 2 }}
              />
              <Line
                type="monotone" dataKey="despesa" name="Despesa"
                stroke={COR.despesa} strokeWidth={2}
                dot={{ r: 3, fill: COR.despesa, stroke: CROMO.superficie, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        titulo={`Resultado por mês — ${ano}`}
        subtitulo="Azul acima de zero, vermelho abaixo"
      >
        <div className="h-48 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={doAno} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid {...GRADE_PROPS} />
              <XAxis dataKey="mes" {...EIXO_PROPS} />
              <YAxis {...EIXO_PROPS} tickFormatter={(v) => formatCompactBRL(v)} width={62} />
              <Tooltip content={<TooltipMoeda />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <ReferenceLine y={0} stroke={CROMO.eixo} />
              {/* Divergente: duas matizes opostas, zero em cinza neutro. */}
              <Bar dataKey="resultado" name="Resultado" radius={[4, 4, 0, 0]}>
                {doAno.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.resultado >= 0 ? DIVERGENTE.positivo : DIVERGENTE.negativo}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        titulo="Sazonalidade da receita"
        subtitulo="Quanto mais escuro, maior a receita. Cinza = sem venda registrada."
      >
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs min-w-[380px]">
            <thead>
              <tr>
                <th className="text-left py-1 px-1 font-semibold text-gray-500 w-12">Ano</th>
                {MESES_ABREV.map((m) => (
                  <th key={m} className="py-1 font-medium text-gray-400 text-center">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heat.linhas.map(([a, valores]) => (
                <tr key={a}>
                  <td className="py-1 px-1 font-semibold text-gray-700 tabular-nums">{a}</td>
                  {valores.map((v, i) => (
                    <td key={i} className="p-0.5">
                      <span
                        className="block h-7 rounded"
                        style={{ background: corSequencial(v, heat.max) }}
                        title={`${MESES_ABREV[i]}/${a}: ${formatBRLInteiro(v)}`}
                        aria-label={`${MESES_ABREV[i]}/${a}: ${formatBRLInteiro(v)}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}
