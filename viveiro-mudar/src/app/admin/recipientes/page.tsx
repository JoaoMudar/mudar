import pool from '@/lib/db'
import RecipientesManager from './RecipientesManager'

export const dynamic = 'force-dynamic'

export default async function RecipientesPage() {
  const { rows: containers } = await pool.query(
    `SELECT * FROM containers ORDER BY name`
  )
  return <RecipientesManager initialContainers={containers} />
}
