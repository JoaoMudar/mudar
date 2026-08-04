import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { getOpcoesLancamento, type OpcoesLancamento } from '../actions'
import DespesaForm from './DespesaForm'

export const dynamic = 'force-dynamic'

/** Lancamento de despesa — substitui a planilha DESPESAS AAAA.xls (P12 Fase 3). */
export default async function NovaDespesaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  await requireRole('admin', 'chefia')
  const { mes } = await searchParams

  let opcoes: OpcoesLancamento = { categorias: [], centros: [], unidades: [], ultimo: null }
  try {
    opcoes = await getOpcoesLancamento()
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-800">Nova despesa</h2>
        <Link href="/financeiro/despesas" className="text-xs text-green-700 font-semibold">
          ver lançamentos
        </Link>
      </div>

      {opcoes.categorias.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-100 p-6 text-center">
          Não consegui carregar as categorias.
        </p>
      ) : (
        <DespesaForm opcoes={opcoes} mesInicial={mes} />
      )}
    </div>
  )
}
