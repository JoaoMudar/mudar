'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import Toast, { type ToastType } from '@/components/Toast'
import { formatBRL } from '@/lib/format'
import {
  salvarRateio, simularRateio,
  type ConfigRateio, type AlteracaoRateio,
} from './actions'

/** Chave de uma celula da grade: categoria + centro (vazio = padrao). */
const chave = (catId: number, centro: string | null) => `${catId}|${centro ?? ''}`

export default function RateioManager({ config }: { config: ConfigRateio }) {
  // Estado local da grade. So o que difere do salvo vira alteracao.
  const salvo = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of config.celulas) m.set(chave(c.categoria_id, c.centro_custo), c.pct_negocio)
    return m
  }, [config.celulas])

  const [valores, setValores] = useState<Map<string, number>>(() => new Map(salvo))
  const [previa, setPrevia] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; tipo: ToastType } | null>(null)
  const [pendente, startTransition] = useTransition()

  const alteracoes: AlteracaoRateio[] = useMemo(() => {
    const saida: AlteracaoRateio[] = []
    for (const [k, v] of valores) {
      if (salvo.get(k) === v) continue
      const [catId, centro] = k.split('|')
      saida.push({
        categoria_id: Number(catId),
        centro_custo: centro === '' ? null : centro,
        pct_negocio: v,
      })
    }
    return saida
  }, [valores, salvo])

  const sujo = alteracoes.length > 0

  function mudar(catId: number, centro: string | null, bruto: string) {
    const n = Number(bruto)
    if (bruto !== '' && (!Number.isFinite(n) || n < 0 || n > 100)) return
    setValores((m) => {
      const novo = new Map(m)
      novo.set(chave(catId, centro), bruto === '' ? 0 : Math.round(n))
      return novo
    })
    setPrevia(null) // qualquer edicao invalida a previa anterior
  }

  function simular() {
    startTransition(async () => {
      const r = await simularRateio(alteracoes)
      if (r.erro) {
        setToast({ msg: r.erro, tipo: 'error' })
        return
      }
      setPrevia(r.despesa ?? null)
    })
  }

  function salvar() {
    startTransition(async () => {
      const r = await salvarRateio(alteracoes)
      if (r.erro) {
        setToast({ msg: r.erro, tipo: 'error' })
        return
      }
      setToast({ msg: `Rateio salvo (${r.alterados} ajuste(s)).`, tipo: 'success' })
      setPrevia(null)
      // Recarrega para o `salvo` refletir o novo estado e a grade sair de "suja".
      window.location.reload()
    })
  }

  function descartar() {
    setValores(new Map(salvo))
    setPrevia(null)
  }

  const delta = previa != null ? previa - config.despesaAtual : null

  return (
    <div className="space-y-3">
      <section className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-xs text-amber-900 leading-snug">
          <strong>Mudança retroativa.</strong> Estes percentuais valem para{' '}
          <strong>todos os anos</strong> do painel — o custo do histórico inteiro é
          recalculado. A receita nunca muda.
        </p>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 p-3">
        <h2 className="text-sm font-bold text-gray-800">Quanto de cada gasto é do viveiro</h2>
        <p className="text-xs text-gray-500 mt-1 leading-snug">
          Só aparecem aqui as categorias <strong>compartilhadas</strong> entre viveiro e
          casa. Categorias que já são só de negócio (insumos, mão de obra) ou só pessoais
          (mercado, saúde) não têm rateio — entram inteiras de um lado só.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          100 = tudo do viveiro · 0 = tudo pessoal · 50 = meio a meio
        </p>
      </section>

      <div className="overflow-x-auto bg-white rounded-xl border border-gray-100">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 font-semibold text-gray-600 sticky left-0 bg-white min-w-[140px]">
                Categoria
              </th>
              <th className="py-2 px-1 font-semibold text-gray-500 text-center">padrão</th>
              {config.centros.map((c) => (
                <th key={c.nome} className="py-2 px-1 font-semibold text-gray-600 text-center whitespace-nowrap">
                  {c.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {config.categorias.map((cat) => (
              <tr key={cat.id} className="border-b border-gray-50 last:border-0">
                <td className="py-1.5 px-2 text-gray-700 sticky left-0 bg-white">
                  <span className="font-medium">{cat.nome}</span>
                  <span className="block text-[10px] text-gray-400">{cat.grupo}</span>
                </td>
                {[null, ...config.centros.map((c) => c.nome)].map((centro) => {
                  const k = chave(cat.id, centro)
                  const v = valores.get(k)
                  const mudou = salvo.has(k) && salvo.get(k) !== v
                  return (
                    <td key={centro ?? '_'} className="py-1 px-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={5}
                        inputMode="numeric"
                        aria-label={`${cat.nome} em ${centro ?? 'padrão'}`}
                        value={v ?? ''}
                        onChange={(e) => mudar(cat.id, centro, e.target.value)}
                        className={`w-14 text-center rounded-lg border py-1 tabular-nums ${
                          mudou
                            ? 'border-green-500 bg-green-50 font-semibold text-green-900'
                            : 'border-gray-200 text-gray-700'
                        }`}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="bg-white rounded-xl border border-gray-100 p-3">
        <p className="text-xs text-gray-500">
          Despesa de negócio de {config.anoReferencia} hoje
        </p>
        <p className="text-lg font-bold text-gray-900">{formatBRL(config.despesaAtual)}</p>

        {previa != null && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">Com estes ajustes, passaria a</p>
            <p className="text-lg font-bold text-green-800">{formatBRL(previa)}</p>
            {delta != null && (
              <p className={`text-xs font-semibold mt-0.5 ${delta >= 0 ? 'text-amber-700' : 'text-blue-700'}`}>
                {delta >= 0 ? '↑' : '↓'} {formatBRL(Math.abs(delta))}
              </p>
            )}
          </div>
        )}
      </section>

      {sujo ? (
        <div className="space-y-2">
          <button
            type="button" onClick={simular} disabled={pendente}
            className="btn-secondary w-full disabled:opacity-60"
          >
            {pendente ? 'Calculando…' : 'Ver o efeito antes de salvar'}
          </button>
          <button
            type="button" onClick={salvar} disabled={pendente}
            className="btn-primary w-full disabled:opacity-60"
          >
            Salvar {alteracoes.length} ajuste{alteracoes.length > 1 ? 's' : ''}
          </button>
          <button
            type="button" onClick={descartar} disabled={pendente}
            className="w-full text-xs text-gray-500 py-2"
          >
            descartar alterações
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-2">
          Altere um percentual para ver o efeito.
        </p>
      )}

      <Link href="/financeiro/custos" className="block text-center text-xs text-green-700 font-semibold py-2">
        ver estrutura de custo →
      </Link>

      {toast && <Toast message={toast.msg} type={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  )
}
