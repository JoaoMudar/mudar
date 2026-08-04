import Link from 'next/link'
import FinanceiroNav from './FinanceiroNav'
import { getCobertura } from './queries'
import { requireRole } from '@/lib/auth'
import { avisoPeriodoParcial, resumirPendencias, type Cobertura } from '@/lib/bi-periodo'

export const metadata = { title: 'Financeiro — Viveiro Mudar' }
export const dynamic = 'force-dynamic'

export default async function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  await requireRole('admin', 'chefia')

  let cobertura: Cobertura[] = []
  try {
    cobertura = await getCobertura()
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  // Faixa fixa: aparece em TODA tela do modulo enquanto houver mes por lancar,
  // e some sozinha quando o ultimo buraco for preenchido. O aviso do ano mais
  // recente e o que importa; os demais estao na tela de preenchimento.
  const pendencias = resumirPendencias(cobertura)
  const anoMaisRecenteComFalta = cobertura
    .filter((c) => c.meses_faltantes.length > 0)
    .sort((a, b) => b.ano - a.ano)[0]
  const aviso = avisoPeriodoParcial(anoMaisRecenteComFalta)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white px-4 py-4">
        <Link href="/" className="text-xs text-green-300 hover:text-white mb-1 inline-block">
          ← Início
        </Link>
        <p className="text-xs text-green-300 uppercase tracking-widest font-semibold">Viveiro Mudar</p>
        <h1 className="text-lg font-bold leading-tight">Financeiro</h1>
      </header>

      <FinanceiroNav />

      {aviso && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
          <p className="text-xs text-amber-900 max-w-3xl mx-auto leading-snug">
            <span aria-hidden="true">⚠️ </span>
            {aviso}
            {pendencias && pendencias.totalMeses > (anoMaisRecenteComFalta?.meses_faltantes.length ?? 0) && (
              <> Ao todo faltam <strong>{pendencias.totalMeses} meses</strong>.</>
            )}{' '}
            <Link href="/financeiro/preenchimento" className="underline font-semibold whitespace-nowrap">
              ver o que falta
            </Link>
          </p>
        </div>
      )}

      <main>{children}</main>
    </div>
  )
}
