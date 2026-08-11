import pool from '@/lib/db'
import { requirePermission } from '@/lib/authz'
import RecipientesManager from './RecipientesManager'

export const dynamic = 'force-dynamic'

export default async function RecipientesPage() {
  await requirePermission('recipiente:criar')

  let containers: any[] = []
  try {
    const { rows } = await pool.query(`SELECT * FROM containers ORDER BY name`)
    containers = rows
  } catch {
    // Banco indisponível durante o build — renderizado fresh em runtime (force-dynamic)
  }
  return <RecipientesManager initialContainers={containers} />
}
