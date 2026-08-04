import nextDynamic from 'next/dynamic'
import { requireRole } from '@/lib/auth'
import { getExecutivo, type ExecutivoData } from './queries'

// Recharts so no cliente: mantem ~100kb fora do render do servidor e evita o
// flash de largura zero do ResponsiveContainer. Mesmo padrao do mapa em
// src/app/fornecedores/mapa/MapClient.tsx.
const ExecutivoView = nextDynamic(() => import('./ExecutivoView'), {
  loading: () => (
    <div className="max-w-3xl mx-auto p-4">
      <div className="h-40 bg-white rounded-xl border border-gray-100 animate-pulse" />
    </div>
  ),
})

export const dynamic = 'force-dynamic'

/** Visao executiva do BI financeiro (P12 Fase 2). */
export default async function FinanceiroPage() {
  await requireRole('admin', 'chefia')

  let data: ExecutivoData = { dre: [], cobertura: [], anoAtual: new Date().getFullYear() }
  try {
    data = await getExecutivo()
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  return <ExecutivoView data={data} />
}
