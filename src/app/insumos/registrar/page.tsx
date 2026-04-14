import pool from '@/lib/db'
import RegistrarForm from './RegistrarForm'

export const metadata = { title: 'Registrar Insumo — Viveiro Mudar' }

export default async function RegistrarPage() {
  const [{ rows: inputsData }, { rows: speciesData }, { rows: containersData }] =
    await Promise.all([
      pool.query(
        `SELECT id, name, unit_of_measure FROM inputs WHERE active = true ORDER BY name`
      ),
      pool.query(
        `SELECT id, common_name FROM species WHERE active = true ORDER BY common_name`
      ),
      pool.query(
        `SELECT id, name FROM containers WHERE active = true ORDER BY name`
      ),
    ])

  const inputs = inputsData.map((r) => ({
    id: r.id,
    label: `${r.name} (${r.unit_of_measure})`,
  }))

  const species = speciesData.map((r) => ({
    id: r.id,
    label: r.common_name,
  }))

  const containers = containersData.map((r) => ({
    id: r.id,
    label: r.name,
  }))

  return <RegistrarForm inputs={inputs} species={species} containers={containers} />
}
