import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { getConfigRateio, type ConfigRateio } from './actions'
import RateioManager from './RateioManager'

export const dynamic = 'force-dynamic'

/** Configuracao do rateio negocio x pessoal (P12). */
export default async function RateioPage() {
  await requireRole('admin', 'chefia')

  let config: ConfigRateio = {
    categorias: [], centros: [], celulas: [],
    anoReferencia: 2025, despesaAtual: 0,
  }
  try {
    config = await getConfigRateio()
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-800">Rateio negócio × pessoal</h2>
        <Link href="/financeiro/custos" className="text-xs text-green-700 font-semibold">
          custos
        </Link>
      </div>

      {config.categorias.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-100 p-6 text-center">
          Não consegui carregar a configuração de rateio.
        </p>
      ) : (
        <RateioManager config={config} />
      )}
    </div>
  )
}
