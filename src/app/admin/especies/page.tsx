import pool from '@/lib/db'
import EspeciesManager from './EspeciesManager'

export const dynamic = 'force-dynamic'

export default async function EspeciesPage() {
  const { rows: species } = await pool.query(
    `SELECT * FROM species ORDER BY common_name`
  )
  return <EspeciesManager initialSpecies={species} />
}
