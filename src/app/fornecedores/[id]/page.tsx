import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { getSpeciesForSelect } from '@/app/pedidos/actions'
import { getSupplierById } from '../actions'
import SupplierDetail from './SupplierDetail'

export const dynamic = 'force-dynamic'

export default async function FornecedorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole('admin', 'chefia')
  const { id } = await params

  const [supplier, species] = await Promise.all([
    getSupplierById(id),
    getSpeciesForSelect(),
  ])
  if (!supplier) notFound()

  return <SupplierDetail supplier={supplier} allSpecies={species} />
}
