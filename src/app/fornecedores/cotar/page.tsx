import { requirePermission } from '@/lib/authz'
import { getSpeciesForSelect } from '@/app/pedidos/actions'
import QuoteWizard from '@/app/fornecedores/cotacoes/QuoteWizard'

export const dynamic = 'force-dynamic'

/** Fluxo B da cotacao: avulsa, sem pedido de cliente vinculado. */
export default async function CotarAvulsaPage() {
  const user = await requirePermission('cotacao:criar')
  const species = await getSpeciesForSelect()

  return (
    <QuoteWizard
      allSpecies={species}
      senderName={user.display_name}
      backHref="/fornecedores"
      backLabel="Fornecedores"
    />
  )
}
