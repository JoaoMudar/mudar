import pool from '@/lib/db'
import ColetaSementesManager from './ColetaSementesManager'

export const dynamic = 'force-dynamic'

export default async function ColetaSementesPage() {
  const [{ rows: collections }, { rows: species }] = await Promise.all([
    pool.query(`
      SELECT sc.*, s.common_name AS species_common_name
      FROM seed_collection_costs sc
      JOIN species s ON s.id = sc.species_id
      ORDER BY sc.collection_date DESC
      LIMIT 50
    `),
    pool.query(
      `SELECT id, common_name FROM species WHERE active = true ORDER BY common_name`
    ),
  ])

  const normalizedCollections = collections.map(({ species_common_name, ...row }) => ({
    ...row,
    species: { common_name: species_common_name },
  }))

  return (
    <ColetaSementesManager
      initialCollections={normalizedCollections}
      speciesOptions={species}
    />
  )
}
