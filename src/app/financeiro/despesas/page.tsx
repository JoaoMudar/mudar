import { requireRole } from '@/lib/auth'
import { getDespesasDoMes, type ListaDespesas } from './actions'
import { getCobertura } from '../queries'
import DespesasClient from './DespesasClient'

export const dynamic = 'force-dynamic'

function mesCorrente(): string {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}`
}

/** Lista de lancamentos por mes (P12 Fase 3). */
export default async function DespesasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  await requireRole('admin', 'chefia')
  const { mes: mesParam } = await searchParams
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : mesCorrente()

  let dados: ListaDespesas = { linhas: [], total: 0, quantidade: 0 }
  let mesesFaltantes: string[] = []
  try {
    const [lista, cobertura] = await Promise.all([getDespesasDoMes(mes), getCobertura()])
    dados = lista
    mesesFaltantes = cobertura
      .flatMap((c) => c.meses_faltantes.map((m) => `${c.ano}-${String(m).padStart(2, '0')}`))
      .sort()
      .reverse()
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  return <DespesasClient dados={dados} mes={mes} mesesFaltantes={mesesFaltantes} />
}
