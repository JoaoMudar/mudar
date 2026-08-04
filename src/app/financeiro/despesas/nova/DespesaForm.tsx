'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import Toast, { type ToastType } from '@/components/Toast'
import { formatBRL, formatMonthYearBR } from '@/lib/format'
import { VALOR_ALERTA } from '@/lib/bi-despesas'
import { criarDespesa, type OpcoesLancamento } from '../actions'

interface Props {
  opcoes: OpcoesLancamento
  /** Mes vindo da tela de preenchimento (AAAA-MM): abre o formulario ja nele. */
  mesInicial?: string
}

/** Primeiro dia do mes, ou hoje quando o mes pedido e o corrente. */
function dataInicial(mes?: string): string {
  const hoje = new Date()
  const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return hojeISO
  return mes === hojeISO.slice(0, 7) ? hojeISO : `${mes}-01`
}

export default function DespesaForm({ opcoes, mesInicial }: Props) {
  const [data, setData] = useState(() => dataInicial(mesInicial))
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoriaId, setCategoriaId] = useState<string>('')
  const [centro, setCentro] = useState<string>('')
  const [quantidade, setQuantidade] = useState('')
  const [unidade, setUnidade] = useState('')
  const [detalhar, setDetalhar] = useState(false)
  const [mc, setMc] = useState('')
  const [mao, setMao] = useState('')
  const [equip, setEquip] = useState('')
  const [desloc, setDesloc] = useState('')

  const [toast, setToast] = useState<{ msg: string; tipo: ToastType } | null>(null)
  const [pendente, startTransition] = useTransition()

  // Contador da sessao: imita o ritmo da planilha, onde voce via a coluna crescer.
  const [feitos, setFeitos] = useState<{ n: number; total: number }>({ n: 0, total: 0 })

  const categoriasPorGrupo = useMemo(() => {
    const m = new Map<string, typeof opcoes.categorias>()
    for (const c of opcoes.categorias) {
      const g = c.grupo ?? 'Outros'
      if (!m.has(g)) m.set(g, [])
      m.get(g)!.push(c)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
  }, [opcoes])

  // Previa do rateio: o usuario ve para que lado o gasto vai ANTES de salvar.
  const previaRateio = useMemo(() => {
    const cat = opcoes.categorias.find((c) => String(c.id) === categoriaId)
    if (!cat) return null
    if (cat.natureza === 'negocio') return 'Entra 100% no negócio'
    if (cat.natureza === 'pessoal') return 'Não entra no negócio (pessoal)'
    const c = opcoes.centros.find((x) => x.nome === centro)
    if (!c) return 'Rateio depende do centro de custo'
    if (c.natureza === 'negocio') return 'Rateio: 100% negócio'
    if (c.natureza === 'pessoal') return 'Rateio: 0% negócio'
    return 'Rateio: 50% negócio'
  }, [categoriaId, centro, opcoes])

  const valorNum = Number(valor.replace(/\./g, '').replace(',', '.'))
  const valorAlto = Number.isFinite(valorNum) && valorNum > VALOR_ALERTA

  function limparParaProximo() {
    // Mantem data, categoria e centro: lancar um mes atrasado e repetir o mesmo
    // contexto dezenas de vezes, mudando so descricao e valor.
    setDescricao('')
    setValor('')
    setQuantidade('')
    setUnidade('')
    setMc(''); setMao(''); setEquip(''); setDesloc('')
    setDetalhar(false)
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const r = await criarDespesa({
        data, descricao, valor_total: valor,
        categoria_id: categoriaId, centro_custo: centro,
        quantidade: quantidade || null, unidade: unidade || null,
        valor_mc: detalhar ? mc || null : null,
        mao_obra: detalhar ? mao || null : null,
        equipamento: detalhar ? equip || null : null,
        deslocamento: detalhar ? desloc || null : null,
      })

      if (r.erro) {
        setToast({ msg: r.erro, tipo: 'error' })
        return
      }
      setFeitos((f) => ({ n: f.n + 1, total: f.total + (Number.isFinite(valorNum) ? valorNum : 0) }))
      setToast({ msg: 'Lançamento salvo.', tipo: 'success' })
      limparParaProximo()
    })
  }

  function repetirUltimo() {
    if (!opcoes.ultimo) return
    setCategoriaId(String(opcoes.ultimo.categoria_id))
    if (opcoes.ultimo.centro_custo) setCentro(opcoes.ultimo.centro_custo)
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      {mesInicial && (
        <p className="text-xs bg-green-50 border border-green-200 text-green-900 rounded-lg px-3 py-2">
          Lançando <strong>{formatMonthYearBR(mesInicial)}</strong>, que está em falta.
        </p>
      )}

      {opcoes.ultimo && !categoriaId && (
        <button
          type="button"
          onClick={repetirUltimo}
          className="w-full text-sm font-semibold text-green-800 bg-green-50 border border-green-200 rounded-xl py-2.5"
        >
          ↺ Repetir categoria e centro do último lançamento
        </button>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-3">
        <div>
          <label className="label" htmlFor="data">Data</label>
          <input
            id="data" type="date" required className="input"
            value={data} onChange={(e) => setData(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="descricao">O que foi</label>
          <input
            id="descricao" type="text" required placeholder="Ex.: substrato para mudas"
            className="input" value={descricao} maxLength={200}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="valor">Valor (R$)</label>
          <input
            id="valor" type="text" required
            // Teclado numerico no celular; texto para aceitar virgula decimal.
            inputMode="decimal" placeholder="0,00"
            className="input text-lg" value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          {valorAlto && (
            <p className="text-xs text-amber-700 mt-1">
              Valor alto ({formatBRL(valorNum)}). Confira antes de salvar.
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="categoria">Categoria</label>
          <select
            id="categoria" required className="input"
            value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}
          >
            <option value="">Escolha…</option>
            {categoriasPorGrupo.map(([grupo, cats]) => (
              <optgroup key={grupo} label={grupo}>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="centro">Centro de custo</label>
          <select
            id="centro" required className="input"
            value={centro} onChange={(e) => setCentro(e.target.value)}
          >
            <option value="">Escolha…</option>
            {opcoes.centros.map((c) => (
              <option key={c.nome} value={c.nome}>{c.nome}</option>
            ))}
          </select>
        </div>

        {previaRateio && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-2">
            {previaRateio}.{' '}
            <Link href="/financeiro/config/rateio" className="text-green-700 underline">
              ajustar rateio
            </Link>
          </p>
        )}
      </div>

      <details
        className="bg-white rounded-xl border border-gray-100 p-3"
        open={detalhar}
        onToggle={(e) => setDetalhar((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="text-sm font-semibold text-gray-700 cursor-pointer">
          Detalhar (opcional)
        </summary>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="qtd">Quantidade</label>
              <input
                id="qtd" type="text" inputMode="decimal" className="input"
                value={quantidade} onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="un">Unidade</label>
              <select
                id="un" className="input"
                value={unidade} onChange={(e) => setUnidade(e.target.value)}
              >
                <option value="">—</option>
                {opcoes.unidades.map((u) => (
                  <option key={u.codigo} value={u.codigo}>
                    {u.codigo}{u.descricao ? ` — ${u.descricao}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Se preencher os campos abaixo, a soma tem que bater com o valor total.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['Material', mc, setMc],
              ['Mão de obra', mao, setMao],
              ['Equipamento', equip, setEquip],
              ['Deslocamento', desloc, setDesloc],
            ] as const).map(([rotulo, v, set]) => (
              <div key={rotulo}>
                <label className="label">{rotulo}</label>
                <input
                  type="text" inputMode="decimal" className="input"
                  value={v} onChange={(e) => set(e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </details>

      <button type="submit" disabled={pendente} className="btn-primary w-full disabled:opacity-60">
        {pendente ? 'Salvando…' : 'Salvar lançamento'}
      </button>

      {feitos.n > 0 && (
        <p className="text-sm text-center text-green-800 font-semibold bg-green-50 rounded-xl py-2">
          {feitos.n} {feitos.n === 1 ? 'lançamento' : 'lançamentos'} nesta sessão ·{' '}
          {formatBRL(feitos.total)}
        </p>
      )}

      {toast && (
        <Toast message={toast.msg} type={toast.tipo} onClose={() => setToast(null)} />
      )}
    </form>
  )
}
