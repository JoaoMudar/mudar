import { requireRole } from '@/lib/auth'
import { getFila, getCategorias, type FilaPendencias } from './actions'
import PendenciasClient from './PendenciasClient'

export const dynamic = 'force-dynamic'

/** Fila de categorizacao por triagem de valor (P12 Fase 3). */
export default async function PendenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ piso?: string }>
}) {
  await requireRole('admin', 'chefia')
  const { piso: pisoParam } = await searchParams
  const piso = pisoParam != null && /^\d+$/.test(pisoParam) ? Number(pisoParam) : 100

  let fila: FilaPendencias = {
    atual: null, sugestoes: [], restantes: 0, valorRestante: 0,
    totalGeral: 0, valorTotalGeral: 0,
  }
  let categorias: { id: number; nome: string; grupo: string | null }[] = []
  try {
    ;[fila, categorias] = await Promise.all([getFila(piso), getCategorias()])
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  return <PendenciasClient fila={fila} categorias={categorias} piso={piso} />
}
