import { requireRole } from '@/lib/auth'
import { viveiroCoords } from '@/lib/geo'
import { getVendas, type VendasData } from '../queries'
import VendasView from './VendasView'

export const dynamic = 'force-dynamic'

/** Vendas por especie, recipiente e geografia (P12 Fase 2). */
export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>
}) {
  await requireRole('admin', 'chefia')
  const { ano: anoParam } = await searchParams
  const ano = anoParam && /^\d{4}$/.test(anoParam) ? Number(anoParam) : undefined

  let data: VendasData = {
    especies: [], recipientesQtd: [], recipientesReceita: [],
    municipios: [], ufs: [], anos: [], ano: null, pctMapeada: 100,
  }
  try {
    data = await getVendas(ano)
  } catch {
    // Banco indisponivel durante o build — renderizado fresh em runtime.
  }

  return (
    <VendasView
      data={data}
      // Resolvido aqui e passado como prop, como em fornecedores/mapa/page.tsx:
      // env de servidor nao chega ao componente client.
      viveiro={viveiroCoords(process.env.VIVEIRO_LAT, process.env.VIVEIRO_LNG)}
    />
  )
}
