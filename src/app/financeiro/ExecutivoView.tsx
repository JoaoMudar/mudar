'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import ChartCard from '@/components/charts/ChartCard'
import StatTile from '@/components/charts/StatTile'
import { COR, CROMO, EIXO_PROPS, GRADE_PROPS, OPACIDADE_PARCIAL } from '@/components/charts/palette'
import { formatBRL, formatBRLInteiro, formatCompactBRL, formatPct } from '@/lib/format'
import { margemExibivel, rotuloJanela } from '@/lib/bi-periodo'
import type { ExecutivoData, DreAno } from './queries'

/** Tooltip proprio: o padrao do Recharts nao formata moeda pt-BR. */
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

function TooltipPct({ active, payload, label }: {
  active?: boolean
  payload?: { value?: number }[]
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-2.5 py-2 text-xs">
      <p className="font-semibold text-gray-800">{label}</p>
      <p className="text-gray-600">
        Margem: <span className="font-semibold tabular-nums">{formatPct(payload[0]?.value)}</span>
      </p>
    </div>
  )
}

export default function ExecutivoView({ data }: { data: ExecutivoData }) {
  const [incluirIncompletos, setIncluirIncompletos] = useState(false)

  const { dre, anoAtual } = data
  const atual: DreAno | undefined =
    dre.find((d) => d.ano === anoAtual) ?? dre[dre.length - 1]

  const cobertura = useMemo(
    () => new Map(data.cobertura.map((c) => [c.ano, c])),
    [data.cobertura],
  )

  const serie = useMemo(
    () => dre.map((d) => ({
      ano: String(d.ano),
      anoNum: d.ano,
      receita: d.receita,
      despesa: d.despesa_negocio,
      resultado: d.resultado,
      completo: d.completo,
      margem: margemExibivel(d.margem_pct, cobertura.get(d.ano), incluirIncompletos),
    })),
    [dre, cobertura, incluirIncompletos],
  )

  const serieMargem = useMemo(
    () => serie.filter((s) => s.margem != null),
    [serie],
  )

  if (!atual) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-100 p-6 text-center">
          Sem dados financeiros. Rode <code className="text-xs">npm run db:import-financeiro</code>.
        </p>
      </div>
    )
  }

  const janela = rotuloJanela(atual.janela_comp)
  const parcial = !atual.completo

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      {/* Figura heroi: o resultado e o numero que decide, entao nao vira grafico. */}
      <section className="bg-white rounded-xl shadow-sm border border-green-200 p-4">
        <p className="text-xs text-gray-500 font-medium">
          Resultado de {atual.ano} · {janela}
        </p>
        <p className="text-4xl font-bold text-gray-900 leading-tight mt-1">
          {formatBRLInteiro(atual.resultado_comp)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Mesmo período de {atual.ano - 1}:{' '}
          <span className="font-semibold text-gray-700">
            {formatBRLInteiro(atual.resultado_comp_anterior)}
          </span>
        </p>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <StatTile
          rotulo="Receita"
          valor={formatBRLInteiro(atual.receita_comp)}
          variacao={atual.var_receita_comp_pct}
          nota={janela}
          parcial={parcial}
        />
        <StatTile
          rotulo="Despesa do negócio"
          valor={formatBRLInteiro(atual.despesa_comp)}
          variacao={atual.var_despesa_comp_pct}
          inverterCorVariacao
          nota={janela}
          parcial={parcial}
        />
        <StatTile
          rotulo="Margem no período"
          valor={formatPct(atual.margem_comp_pct)}
          nota={`${janela} · ${atual.ano - 1}: ${formatPct(atual.margem_comp_anterior_pct)}`}
          parcial={parcial}
        />
        <StatTile
          rotulo="Margem do ano"
          valor={formatPct(margemExibivel(atual.margem_pct, cobertura.get(atual.ano), incluirIncompletos))}
          nota={
            parcial
              ? 'suprimida: faltam meses de despesa'
              : 'ano completo'
          }
        />
      </div>

      <ChartCard
        titulo="Receita e despesa por ano"
        subtitulo="Despesa já rateada entre negócio e pessoal"
        aviso={
          serie.some((s) => !s.completo)
            ? 'Anos com barra clara estão incompletos — falta lançar despesa, então o resultado deles aparece maior do que é.'
            : undefined
        }
        tabela={{
          colunas: [
            { chave: 'ano', rotulo: 'Ano' },
            { chave: 'receita', rotulo: 'Receita', numerica: true },
            { chave: 'despesa', rotulo: 'Despesa', numerica: true },
            { chave: 'resultado', rotulo: 'Resultado', numerica: true },
            { chave: 'margem', rotulo: 'Margem', numerica: true },
          ],
          linhas: serie.map((s) => ({
            ano: s.completo ? s.ano : `${s.ano} (parcial)`,
            receita: formatBRLInteiro(s.receita),
            despesa: formatBRLInteiro(s.despesa),
            resultado: formatBRLInteiro(s.resultado),
            margem: formatPct(s.margem),
          })),
        }}
      >
        {/* Altura inclui a faixa do eixo X, para o card nao criar scroll interno. */}
        <div className="h-56 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid {...GRADE_PROPS} />
              <XAxis dataKey="ano" {...EIXO_PROPS} />
              <YAxis {...EIXO_PROPS} tickFormatter={(v) => formatCompactBRL(v)} width={62} />
              <Tooltip content={<TooltipMoeda />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              {/* Mesma unidade (R$) => UM eixo. Nunca um segundo eixo aqui. */}
              <Bar dataKey="receita" name="Receita" fill={COR.receita} radius={[4, 4, 0, 0]}>
                {serie.map((s) => (
                  <Cell key={s.ano} fillOpacity={s.completo ? 1 : OPACIDADE_PARCIAL} />
                ))}
              </Bar>
              <Bar dataKey="despesa" name="Despesa" fill={COR.despesa} radius={[4, 4, 0, 0]}>
                {serie.map((s) => (
                  <Cell key={s.ano} fillOpacity={s.completo ? 1 : OPACIDADE_PARCIAL} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Margem em % tem escala propria => grafico separado, jamais 2o eixo. */}
      <ChartCard
        titulo="Margem por ano"
        subtitulo="Só anos completos — margem de ano incompleto não significa nada"
        tabela={{
          colunas: [
            { chave: 'ano', rotulo: 'Ano' },
            { chave: 'margem', rotulo: 'Margem', numerica: true },
          ],
          linhas: serieMargem.map((s) => ({ ano: s.ano, margem: formatPct(s.margem) })),
        }}
      >
        {serieMargem.length === 0 ? (
          <p className="text-xs text-gray-400 py-8 text-center">
            Nenhum ano completo no período.
          </p>
        ) : (
          <div className="h-44 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serieMargem} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid {...GRADE_PROPS} />
                <XAxis dataKey="ano" {...EIXO_PROPS} />
                <YAxis
                  {...EIXO_PROPS}
                  width={40}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip content={<TooltipPct />} />
                {/* Serie unica: o titulo ja diz o que e, entao sem legenda. */}
                <Line
                  type="monotone"
                  dataKey="margem"
                  stroke={COR.padrao}
                  strokeWidth={2}
                  dot={{ r: 4, fill: COR.padrao, stroke: CROMO.superficie, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <label className="flex items-center gap-2 text-xs text-gray-500 px-1 pb-2">
        <input
          type="checkbox"
          checked={incluirIncompletos}
          onChange={(e) => setIncluirIncompletos(e.target.checked)}
          className="w-4 h-4 accent-green-700"
        />
        Mostrar margem de anos incompletos (sabendo que ela está inflada)
      </label>
    </div>
  )
}
