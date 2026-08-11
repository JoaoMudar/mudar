import pool from '@/lib/db'
import { requirePermission } from '@/lib/authz'
import UsuariosManager from './UsuariosManager'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  await requirePermission('usuario:criar')

  let users: any[] = []
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.role, u.active,
              u.created_at,
              s.last_seen_at
       FROM users u
       LEFT JOIN LATERAL (
         SELECT last_seen_at FROM sessions
         WHERE user_id = u.id ORDER BY last_seen_at DESC LIMIT 1
       ) s ON true
       ORDER BY u.display_name`,
    )
    users = rows
  } catch {
    // Banco indisponivel durante build
  }
  return <UsuariosManager initialUsers={users} />
}
