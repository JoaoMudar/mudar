'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import Toast, { type ToastType } from '@/components/Toast'
import { formatBRL, formatDateBR } from '@/lib/format'
import { categorizar, type FilaPendencias } from './actions'

interface Props {
  fila: FilaPendencias
  categorias: { id: number; nome: string; grupo: string | null }[]
  piso: number
}

const PISOS = [
  { valor: 100, rotulo: '≥ R$100' },
  { valor: 50,  rotulo: '≥ R$50' },
  { valor: 0,   rotulo: 'tudo' },
]

export default function PendenciasClient({ fila, categorias, piso }: Props) {
  const router = useRouter()
  const [toast, setToast] = useState<{ msg: string; tipo: ToastType } | null>(null)
  const [pendente, startTransition] = useTransition()
  const [criarRegra, setCriarRegra] = useState(true)
  const [verTodas, setVerTodas] = useState(false)

  const categoriasPorGrupo = useMemo(() => {
    const m = new Map<string, typeof categorias>()
    for (const c of categorias) {
      const g = c.grupo ?? 'Outros'
      if (!m.has(g)) m.set(g, [])
      m.get(g)!.push(c)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
  }, [categorias])

  function classificar(categoriaId: number) {
    if (!fila.atual) return
    startTransition(async () => {
      const r = await categorizar(fila.atual!.id, categoriaId, criarRegra)
      if (r.erro) {
        setToast({ msg: r.erro, tipo: 'error' })
        return
      }
      setToast({
        msg: r.aplicadosEmLote
          ? `Classificado. A regra resolveu mais ${r.aplicadosEmLote} lançamento(s).`
          : 'Classificado.',
        tipo: 'success',
      })
      setVerTodas(false)
      router.refresh()
    })
  }

  const progresso = fila.totalGeral > 0
    ? Math.round(((fila.totalGeral - fila.restantes) / fila.totalGeral) * 100)
    : 100

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-3">
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <h2 className="text-sm font-bold text-gray-800">Lançamentos sem categoria</h2>
        <p className="text-xs text-gray-500 mt-1 leading-snug">
          Sem categoria, um gasto não entra em nenhum gráfico de custo. A lista abre pelos
          maiores — os {PISOS[0].rotulo} são poucos e cobrem a maior parte do valor.
        </p>

        <div className="flex gap-1 mt-3">
          {PISOS.map((p) => (
            <button
              key={p.valor}
              type="button"
              onClick={() => router.push(`/financeiro/pendencias?piso=${p.valor}`)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                piso === p.valor
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {p.rotulo}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>
              restam <strong className="tabular-nums">{fila.restantes.toLocaleString('pt-BR')}</strong>
              {' '}· {formatBRL(fila.valorRestante)}
            </span>
            <span className="tabular-nums">{progresso}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-600 rounded-full" style={{ width: `${progresso}%` }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Cauda completa: {fila.totalGeral.toLocaleString('pt-BR')} lançamentos ·{' '}
            {formatBRL(fila.valorTotalGeral)}
          </p>
        </div>
      </section>

      {!fila.atual ? (
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
          <p className="text-sm font-semibold text-green-700">
            Nada pendente nesta faixa.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Baixe o filtro para pegar os lançamentos menores.
          </p>
        </div>
      ) : (
        <>
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-lg font-bold text-gray-900 break-words">{fila.atual.descricao}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatBRL(fila.atual.valor)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDateBR(fila.atual.data_ref)}
              {fila.atual.centro_custo && ` · ${fila.atual.centro_custo}`}
            </p>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-semibold text-gray-600 px-1">
              {verTodas ? 'Todas as categorias' : 'Sugestões'}
            </p>

            <div className="grid grid-cols-1 gap-2">
              {(verTodas ? [] : fila.sugestoes).map((s) => (
                <button
                  key={s.categoria_id}
                  type="button"
                  disabled={pendente}
                  onClick={() => classificar(s.categoria_id)}
                  className="text-left bg-white rounded-xl border border-gray-200 px-4 py-3 active:bg-green-50 disabled:opacity-50"
                >
                  <span className="text-sm font-semibold text-gray-800">{s.nome}</span>
                  <span className="block text-[11px] text-gray-400 mt-0.5">
                    {s.grupo}
                    {s.origem === 'regra' ? ' · regra que você criou' : ' · comum neste centro de custo'}
                  </span>
                </button>
              ))}
            </div>

            {verTodas && (
              <div className="bg-white rounded-xl border border-gray-200 p-3 max-h-80 overflow-y-auto space-y-3">
                {categoriasPorGrupo.map(([grupo, cats]) => (
                  <div key={grupo}>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      {grupo}
                    </p>
                    <div className="mt-1 space-y-1">
                      {cats.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          disabled={pendente}
                          onClick={() => classificar(c.id)}
                          className="block w-full text-left text-sm text-gray-700 px-2 py-1.5 rounded-lg active:bg-green-50 disabled:opacity-50"
                        >
                          {c.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setVerTodas((v) => !v)}
              className="btn-secondary w-full text-sm"
            >
              {verTodas ? 'voltar às sugestões' : 'ver todas as categorias'}
            </button>
          </section>

          <label className="flex items-start gap-2 text-xs text-gray-600 bg-white rounded-xl border border-gray-100 p-3">
            <input
              type="checkbox"
              checked={criarRegra}
              onChange={(e) => setCriarRegra(e.target.checked)}
              className="w-4 h-4 accent-green-700 mt-0.5"
            />
            <span>
              Aplicar a mesma categoria a lançamentos parecidos.
              <span className="block text-gray-400 mt-0.5">
                É isso que faz a fila encolher rápido — sem regra, cada linha vira uma decisão.
              </span>
            </span>
          </label>
        </>
      )}

      {toast && <Toast message={toast.msg} type={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
