import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { getQualidade, type QualidadeData } from '../queries'
import { formatBRL, formatMonthYearBR } from '@/lib/format'

export const dynamic = 'force-dynamic'

const SEVERIDADE: Record<string, { classe: string; icone: string }> = {
  alta:  { classe: 'border-red-200 bg-red-50',     icone: '🔴' },
  media: { classe: 'border-amber-200 bg-amber-50', icone: '🟡' },
  info:  { classe: 'border-gray-200 bg-white',     icone: 'ℹ️' },
}

/** Qualidade do dado — um cartao por defeito conhecido (P12 Fase 2). */
export default async function QualidadePage() {
  await requireRole('admin', 'chefia')

  let data: QualidadeData = {
    metricas: [], divergencias: [], conferenciaTotal: 0, conferenciaOk: 0,
  }
  try {
    data = await getQualidade()
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  // Defeito com contagem zero e um problema resolvido: sai da lista em vez de
  // ocupar espaco com "0".
  const ativos = data.metricas.filter((m) => m.quantidade > 0 || m.severidade === 'info')

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <h2 className="text-sm font-bold text-gray-800">Qualidade dos dados</h2>
        <p className="text-xs text-gray-500 mt-1 leading-snug">
          O que ainda está torto na base e o que já está sob controle. Os itens marcados
          com <span aria-hidden="true">ℹ️</span> são informativos — mostram que uma regra
          está ativa, não que há problema.
        </p>
      </section>

      <div className="space-y-2">
        {ativos.map((m) => {
          const s = SEVERIDADE[m.severidade] ?? SEVERIDADE.info
          return (
            <Link
              key={m.metrica}
              href={m.rota}
              className={`flex items-start gap-3 rounded-xl border p-3 ${s.classe}`}
            >
              <span className="text-lg shrink-0" aria-hidden="true">{s.icone}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800">{m.rotulo}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  <span className="font-bold tabular-nums">{m.quantidade.toLocaleString('pt-BR')}</span>
                  {m.valor != null && m.valor > 0 && <> · {formatBRL(m.valor)}</>}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <h3 className="text-sm font-bold text-gray-800">Conferência com a planilha</h3>
        <p className="text-xs text-gray-500 mt-1 leading-snug">
          Cada aba mensal do Excel trazia o próprio total. Comparando com a soma dos
          lançamentos importados dá para saber onde a importação não bateu.{' '}
          <strong>{data.conferenciaOk} de {data.conferenciaTotal}</strong> meses conferem
          ao centavo.
        </p>

        {data.divergencias.length > 0 && (
          <div className="overflow-x-auto mt-3 -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 px-1 font-semibold text-gray-600">Mês</th>
                  <th className="text-right py-1.5 px-1 font-semibold text-gray-600">Planilha</th>
                  <th className="text-right py-1.5 px-1 font-semibold text-gray-600">Importado</th>
                  <th className="text-right py-1.5 px-1 font-semibold text-gray-600">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {data.divergencias.map((d) => (
                  <tr key={`${d.ano}-${d.mes}-${d.aba}`} className="border-b border-gray-50 last:border-0">
                    <td className="py-1.5 px-1 text-gray-700">{formatMonthYearBR(d.ano, d.mes)}</td>
                    <td className="py-1.5 px-1 text-right text-gray-600 tabular-nums">
                      {formatBRL(d.total_planilha)}
                    </td>
                    <td className="py-1.5 px-1 text-right text-gray-600 tabular-nums">
                      {formatBRL(d.total_detalhe)}
                    </td>
                    <td
                      className={`py-1.5 px-1 text-right font-semibold tabular-nums ${
                        d.diferenca > 0 ? 'text-amber-700' : 'text-blue-700'
                      }`}
                    >
                      {formatBRL(d.diferenca)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
