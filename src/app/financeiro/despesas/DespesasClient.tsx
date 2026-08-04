'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Toast, { type ToastType } from '@/components/Toast'
import { formatBRL, formatDateBR, formatMonthYearBR } from '@/lib/format'
import { excluirDespesa, type ListaDespesas } from './actions'

interface Props {
  dados: ListaDespesas
  mes: string
  /** Meses sem lancamento, para o atalho de ir direto ao buraco. */
  mesesFaltantes: string[]
}

export default function DespesasClient({ dados, mes, mesesFaltantes }: Props) {
  const router = useRouter()
  const [toast, setToast] = useState<{ msg: string; tipo: ToastType } | null>(null)
  const [pendente, startTransition] = useTransition()

  function trocarMes(novo: string) {
    router.push(`/financeiro/despesas?mes=${novo}`)
  }

  function excluir(id: number, descricao: string) {
    startTransition(async () => {
      const r = await excluirDespesa(id)
      if (r.erro) {
        setToast({ msg: r.erro, tipo: 'error' })
        return
      }
      setToast({ msg: `"${descricao}" removido.`, tipo: 'success' })
      router.refresh()
    })
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-gray-800">Lançamentos</h2>
        <Link href="/financeiro/despesas/nova" className="btn-primary text-sm py-1.5 px-3">
          + Nova
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-3">
        <label className="label" htmlFor="mes">Mês</label>
        <input
          id="mes" type="month" className="input"
          value={mes} onChange={(e) => trocarMes(e.target.value)}
        />

        {mesesFaltantes.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Meses sem lançamento:</p>
            <div className="flex flex-wrap gap-1">
              {mesesFaltantes.map((m) => (
                <Link
                  key={m}
                  href={`/financeiro/despesas/nova?mes=${m}`}
                  className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1"
                >
                  {formatMonthYearBR(m)}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-baseline justify-between">
        <span className="text-xs text-gray-500">
          {dados.quantidade} {dados.quantidade === 1 ? 'lançamento' : 'lançamentos'}
        </span>
        <span className="text-lg font-bold text-gray-900">{formatBRL(dados.total)}</span>
      </div>

      {dados.linhas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
          <p className="text-sm text-gray-500">Nenhum lançamento em {formatMonthYearBR(mes)}.</p>
          <Link
            href={`/financeiro/despesas/nova?mes=${mes}`}
            className="btn-primary inline-block mt-3 text-sm"
          >
            Lançar o primeiro
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {dados.linhas.map((l) => (
            <li key={l.id} className="bg-white rounded-xl border border-gray-100 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 break-words">{l.descricao}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDateBR(l.data)}
                    {l.categoria && ` · ${l.categoria}`}
                    {l.centro_custo && ` · ${l.centro_custo}`}
                  </p>
                  {l.origem_lancamento === 'app' && (
                    <p className="text-[11px] text-green-700 mt-0.5">
                      lançado no app{l.criado_por ? ` por ${l.criado_por}` : ''}
                    </p>
                  )}
                </div>
                <span className="text-sm font-bold text-gray-900 tabular-nums whitespace-nowrap">
                  {formatBRL(l.valor_total)}
                </span>
              </div>

              {/* So o que veio do app pode ser removido: linha importada da
                  planilha e historico, e mexer nela quebraria a conferencia. */}
              {l.origem_lancamento === 'app' && (
                <button
                  type="button"
                  disabled={pendente}
                  onClick={() => excluir(l.id, l.descricao)}
                  className="text-xs text-red-600 font-semibold mt-2 disabled:opacity-50"
                >
                  remover
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {toast && <Toast message={toast.msg} type={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
