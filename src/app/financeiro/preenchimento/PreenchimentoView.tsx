'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { MESES_ABREV, formatBRLInteiro } from '@/lib/format'
import { estadoDoMes, resumirPendencias, type EstadoMes } from '@/lib/bi-periodo'
import type { PreenchimentoData } from '../queries'

const ESTILO: Record<EstadoMes, { classe: string; rotulo: string }> = {
  completo: { classe: 'bg-green-600 text-white',            rotulo: 'lançado' },
  parcial:  { classe: 'bg-amber-300 text-amber-900',        rotulo: 'poucos lançamentos' },
  vazio:    { classe: 'bg-red-100 text-red-700 border border-red-300', rotulo: 'nada lançado' },
  futuro:   { classe: 'bg-gray-50 text-gray-300',           rotulo: 'ainda não chegou' },
}

export default function PreenchimentoView({ data }: { data: PreenchimentoData }) {
  const { meses, cobertura } = data

  const porAnoMes = useMemo(() => {
    const m = new Map<string, { lancamentos: number; valor: number }>()
    for (const l of meses) m.set(`${l.ano}-${l.mes}`, { lancamentos: l.lancamentos, valor: l.valor })
    return m
  }, [meses])

  const anos = useMemo(
    () => [...cobertura].sort((a, b) => b.ano - a.ano),
    [cobertura],
  )

  const resumo = resumirPendencias(cobertura)

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <h2 className="text-sm font-bold text-gray-800">O que falta lançar</h2>
        <p className="text-xs text-gray-500 mt-1 leading-snug">
          Cada quadradinho é um mês. Toque em um mês vermelho para lançar as despesas dele.
          Enquanto houver vermelho, a margem daquele ano aparece maior do que é.
        </p>
        {resumo ? (
          <p className="text-sm text-red-700 font-semibold mt-2">
            Faltam {resumo.totalMeses} meses: {resumo.descricao}
          </p>
        ) : (
          <p className="text-sm text-green-700 font-semibold mt-2">
            Tudo lançado. O painel está confiável.
          </p>
        )}
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        {/* Legenda antes da grade: a cor sozinha nunca carrega o significado. */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
          {(['completo', 'parcial', 'vazio', 'futuro'] as EstadoMes[]).map((e) => (
            <span key={e} className="flex items-center gap-1 text-[11px] text-gray-500">
              <span className={`w-3 h-3 rounded ${ESTILO[e].classe}`} aria-hidden="true" />
              {ESTILO[e].rotulo}
            </span>
          ))}
        </div>

        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs min-w-[380px]">
            <thead>
              <tr>
                <th className="text-left py-1 px-1 font-semibold text-gray-500 w-12">Ano</th>
                {MESES_ABREV.map((m) => (
                  <th key={m} className="py-1 font-medium text-gray-400 text-center">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {anos.map((c) => (
                <tr key={c.ano}>
                  <td className="py-1 px-1 font-semibold text-gray-700 tabular-nums">{c.ano}</td>
                  {MESES_ABREV.map((_, i) => {
                    const mes = i + 1
                    const info = porAnoMes.get(`${c.ano}-${mes}`)
                    const estado = estadoDoMes(
                      c.ano, mes, info?.lancamentos ?? 0, c.meses_faltantes,
                    )
                    const rotulo = `${MESES_ABREV[i]}/${c.ano}: ${ESTILO[estado].rotulo}` +
                      (info ? ` — ${info.lancamentos} lançamentos, ${formatBRLInteiro(info.valor)}` : '')

                    const celula = (
                      <span
                        className={`flex items-center justify-center h-7 rounded text-[10px] font-semibold ${ESTILO[estado].classe}`}
                      >
                        {estado === 'vazio' ? '!' : estado === 'futuro' ? '' : info?.lancamentos ?? ''}
                      </span>
                    )

                    return (
                      <td key={mes} className="p-0.5" title={rotulo}>
                        {estado === 'vazio' || estado === 'parcial' ? (
                          <Link
                            href={`/financeiro/despesas/nova?mes=${c.ano}-${String(mes).padStart(2, '0')}`}
                            aria-label={`Lançar despesas de ${rotulo}`}
                            className="block hover:opacity-75 transition-opacity"
                          >
                            {celula}
                          </Link>
                        ) : (
                          <span aria-label={rotulo}>{celula}</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          O número dentro do quadradinho é a quantidade de lançamentos do mês.
        </p>
      </section>

      <Link
        href="/financeiro/despesas/nova"
        className="btn-primary block text-center"
      >
        Lançar uma despesa
      </Link>
    </div>
  )
}
