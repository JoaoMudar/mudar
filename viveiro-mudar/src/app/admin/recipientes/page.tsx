import pool from '@/lib/db'
import RecipientesManager from './RecipientesManager'

export const dynamic = 'force-dynamic'

export default async function RecipientesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let containers: any[] = []
  try {
    const { rows } = await pool.query(`SELECT * FROM containers ORDER BY name`)
    containers = rows
  } catch {
    // Banco indisponível durante o build — renderizado fresh em runtime (force-dynamic)
  }
  return <RecipientesManager initialContainers={containers} />
}
