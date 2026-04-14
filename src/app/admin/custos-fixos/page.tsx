import pool from '@/lib/db'
import CustosFixosManager from './CustosFixosManager'

export const dynamic = 'force-dynamic'

export default async function CustosFixosPage() {
  const { rows: costs } = await pool.query(
    `SELECT * FROM fixed_costs ORDER BY reference_month DESC, category LIMIT 60`
  )
  return <CustosFixosManager initialCosts={costs} />
}
