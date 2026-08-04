'use client'

import nextDynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import ChartCard from '@/components/charts/ChartCard'
import { COR, CROMO, EIXO_PROPS, GRADE_PROPS } from '@/components/charts/palette'
import { formatBRL, formatBRLInteiro, formatCompactBRL, formatPct } from '@/lib/format'
import type { LatLng } from '@/lib/geo'
import type { VendasData } from '../queries'

// Leaflet so no cliente: o pacote toca `window` na importacao.
const VendasMapa = nextDynamic(() => import('./VendasMapa'), {
  ssr: false,
  loading: () => (
    <div className="h-[60vh] bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-400">
      Carregando mapa…
    </div>
  ),
})

const fmtMilhar = (n: number) => n.toLocaleString('pt-BR')

function TooltipSimples({ active, payload, sufixo }: {
  active?: boolean
  payload?: { value?: number; payload?: { nome?: string } }[]
  sufixo: 'moeda' | 'unidades'
}) {
  if (!active || !payload?.length) return null
  const v = payload[0].value ?? 0
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-2.5 py-2 text-xs">
      <p className="font-semibold text-gray-800">{payload[0].payload?.nome}</p>
      <p className="text-gray-600 tabular-nums">
        {sufixo === 'moeda' ? formatBRL(v) : `${fmtMilhar(v)} mudas`}
      </p>
    </div>
  )
}

export default function VendasView({ data, viveiro }: { data: VendasData; viveiro: LatLng }) {
  const router = useRouter()

  const especies = data.especies.map((e) => ({ nome: e.nome_comum, valor: e.receita }))
  const recQtd = data.recipientesQtd.map((r) => ({ nome: r.recipiente, valor: r.quantidade }))
  const recRec = data.recipientesReceita.map((r) => ({ nome: r.recipiente, valor: r.receita }))
  const ufs = data.ufs.map((u) => ({ nome: u.uf, valor: u.receita }))

  const receitaTotalGeo = data.ufs.reduce((s, u) => s + u.receita, 0)

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <label htmlFor="ano" className="text-xs font-semibold text-gray-600">Ano</label>
        <select
          id="ano" className="input py-1.5 w-auto"
          value={data.ano ?? ''}
          onChange={(e) =>
            router.push(e.target.value ? `/financeiro/vendas?ano=${e.target.value}` : '/financeiro/vendas')
          }
        >
          <option value="">todos</option>
          {data.anos.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <ChartCard
        titulo="Top 15 espécies por receita"
        subtitulo={data.ano ? `${data.ano}` : 'todos os anos da janela'}
        tabela={{
          colunas: [
            { chave: 'especie', rotulo: 'Espécie' },
            { chave: 'qtd', rotulo: 'Mudas', numerica: true },
            { chave: 'receita', rotulo: 'Receita', numerica: true },
          ],
          linhas: data.especies.map((e) => ({
            especie: e.nome_comum,
            qtd: fmtMilhar(Math.round(e.quantidade)),
            receita: formatBRLInteiro(e.receita),
          })),
        }}
      >
        {especies.length === 0 ? (
          <p className="text-xs text-gray-400 py-8 text-center">Sem vendas no período.</p>
        ) : (
          <div style={{ height: Math.max(200, especies.length * 26) }} className="-ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={especies} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid {...GRADE_PROPS} horizontal={false} vertical />
                <XAxis type="number" {...EIXO_PROPS} tickFormatter={(v) => formatCompactBRL(v)} />
                <YAxis
                  type="category" dataKey="nome" {...EIXO_PROPS}
                  width={116} tick={{ fill: CROMO.tintaSecundaria, fontSize: 10 }}
                />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} content={<TooltipSimples sufixo="moeda" />} />
                {/* Categoria nominal => uma cor so. */}
                <Bar dataKey="valor" fill={COR.padrao} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      {/* Dois graficos separados de proposito: sao FONTES diferentes, com
          cobertura diferente. Juntar num so daria a impressao de que o mix de
          quantidade e o de receita saem do mesmo lugar. */}
      <ChartCard
        titulo="Mudas vendidas por recipiente"
        subtitulo="Fonte: controle de notas — é a contagem mais completa"
        tabela={{
          colunas: [
            { chave: 'recipiente', rotulo: 'Recipiente' },
            { chave: 'qtd', rotulo: 'Mudas', numerica: true },
          ],
          linhas: data.recipientesQtd.map((r) => ({
            recipiente: r.recipiente,
            qtd: fmtMilhar(Math.round(r.quantidade)),
          })),
        }}
      >
        {recQtd.length === 0 ? (
          <p className="text-xs text-gray-400 py-8 text-center">Sem dados no período.</p>
        ) : (
          <div style={{ height: Math.max(140, recQtd.length * 30) }} className="-ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recQtd} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid {...GRADE_PROPS} horizontal={false} vertical />
                <XAxis type="number" {...EIXO_PROPS} tickFormatter={(v) => fmtMilhar(v)} />
                <YAxis
                  type="category" dataKey="nome" {...EIXO_PROPS}
                  width={92} tick={{ fill: CROMO.tintaSecundaria, fontSize: 10 }}
                />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} content={<TooltipSimples sufixo="unidades" />} />
                <Bar dataKey="valor" fill={COR.padrao} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard
        titulo="Receita por recipiente"
        subtitulo="Fonte: itens das notas fiscais — cobertura menor que a contagem acima"
        aviso={
          data.recipientesReceita.some((r) => r.recipiente === '(não especificado)')
            ? 'A fatia "(não especificado)" são itens de nota sem recipiente identificado. Aparece de propósito: escondê-la faria o mix parecer mais completo do que é.'
            : undefined
        }
        tabela={{
          colunas: [
            { chave: 'recipiente', rotulo: 'Recipiente' },
            { chave: 'itens', rotulo: 'Itens', numerica: true },
            { chave: 'receita', rotulo: 'Receita', numerica: true },
          ],
          linhas: data.recipientesReceita.map((r) => ({
            recipiente: r.recipiente,
            itens: fmtMilhar(r.itens),
            receita: formatBRLInteiro(r.receita),
          })),
        }}
      >
        {recRec.length === 0 ? (
          <p className="text-xs text-gray-400 py-8 text-center">Sem dados no período.</p>
        ) : (
          <div style={{ height: Math.max(140, recRec.length * 30) }} className="-ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recRec} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid {...GRADE_PROPS} horizontal={false} vertical />
                <XAxis type="number" {...EIXO_PROPS} tickFormatter={(v) => formatCompactBRL(v)} />
                <YAxis
                  type="category" dataKey="nome" {...EIXO_PROPS}
                  width={116} tick={{ fill: CROMO.tintaSecundaria, fontSize: 10 }}
                />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} content={<TooltipSimples sufixo="moeda" />} />
                <Bar dataKey="valor" fill={COR.padrao} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard
        titulo="Para onde as mudas vão"
        subtitulo={`${data.municipios.length} municípios · círculo maior = mais receita`}
        aviso={
          data.pctMapeada < 95 ? (
            <>
              Só <strong>{formatPct(data.pctMapeada)}</strong> da receita tem coordenada —
              o mapa está deixando vendas de fora. A tabela abaixo está completa.
            </>
          ) : undefined
        }
      >
        {data.municipios.length === 0 ? (
          <p className="text-xs text-gray-400 py-8 text-center">Sem vendas no período.</p>
        ) : (
          <VendasMapa municipios={data.municipios} viveiro={viveiro} />
        )}
      </ChartCard>

      <ChartCard
        titulo="Receita por estado"
        tabela={{
          colunas: [
            { chave: 'uf', rotulo: 'UF' },
            { chave: 'notas', rotulo: 'Notas', numerica: true },
            { chave: 'receita', rotulo: 'Receita', numerica: true },
            { chave: 'pct', rotulo: '%', numerica: true },
          ],
          linhas: data.ufs.map((u) => ({
            uf: u.uf,
            notas: fmtMilhar(u.notas),
            receita: formatBRLInteiro(u.receita),
            pct: formatPct(receitaTotalGeo > 0 ? (u.receita / receitaTotalGeo) * 100 : null),
          })),
        }}
      >
        <div style={{ height: Math.max(120, ufs.length * 28) }} className="-ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ufs} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid {...GRADE_PROPS} horizontal={false} vertical />
              <XAxis type="number" {...EIXO_PROPS} tickFormatter={(v) => formatCompactBRL(v)} />
              <YAxis
                type="category" dataKey="nome" {...EIXO_PROPS}
                width={40} tick={{ fill: CROMO.tintaSecundaria, fontSize: 10 }}
              />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} content={<TooltipSimples sufixo="moeda" />} />
              <Bar dataKey="valor" fill={COR.padrao} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <h2 className="text-sm font-bold text-gray-800 mb-2">Municípios</h2>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 px-1 font-semibold text-gray-600">Município</th>
                <th className="text-left py-1.5 px-1 font-semibold text-gray-600">UF</th>
                <th className="text-right py-1.5 px-1 font-semibold text-gray-600">Notas</th>
                <th className="text-right py-1.5 px-1 font-semibold text-gray-600">Receita</th>
              </tr>
            </thead>
            <tbody>
              {data.municipios.slice(0, 60).map((m, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-1.5 px-1 text-gray-700">{m.municipio}</td>
                  <td className="py-1.5 px-1 text-gray-400">{m.uf}</td>
                  <td className="py-1.5 px-1 text-right text-gray-600 tabular-nums">{m.notas}</td>
                  <td className="py-1.5 px-1 text-right text-gray-700 tabular-nums">
                    {formatBRLInteiro(m.receita)}
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
