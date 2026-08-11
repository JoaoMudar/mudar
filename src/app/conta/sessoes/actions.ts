'use server'

import { revalidatePath } from 'next/cache'
import pool from '@/lib/db'
import { getCurrentSessionTokenHash } from '@/lib/auth'
import { authorize, requirePermission } from '@/lib/authz'

const PATH = '/conta/sessoes'

export interface SessionRow {
  id: string
  ip: string | null
  user_agent: string | null
  created_at: string
  last_seen_at: string
  is_current: boolean
}

/** Sessoes ativas (nao expiradas) do usuario logado, marcando a atual. */
export async function listMySessions(): Promise<SessionRow[]> {
  const user = await requirePermission('sessao_propria:ler')
  const currentHash = await getCurrentSessionTokenHash()
  const { rows } = await pool.query(
    `SELECT id, token_hash, ip, user_agent, created_at, last_seen_at
     FROM sessions
     WHERE user_id = $1 AND expires_at > NOW()
     ORDER BY last_seen_at DESC`,
    [user.id],
  )
  // token_hash nunca sai daqui: vira apenas o booleano is_current.
  return rows.map((r) => ({
    id: r.id,
    ip: r.ip,
    user_agent: r.user_agent,
    created_at: r.created_at,
    last_seen_at: r.last_seen_at,
    is_current: r.token_hash === currentHash,
  }))
}

/** Encerra uma sessao especifica (escopada ao dono — nao da para encerrar a de outro). */
export async function revokeSession(sessionId: string): Promise<{ error?: string }> {
  const auth = await authorize('sessao_propria:excluir')
  if (!auth.ok) return { error: auth.error }
  const user = auth.user
  await pool.query(`DELETE FROM sessions WHERE id = $1 AND user_id = $2`, [
    sessionId,
    user.id,
  ])
  revalidatePath(PATH)
  return {}
}

/** Encerra todas as sessoes do usuario, exceto a atual (util ao perder um aparelho). */
export async function revokeOtherSessions(): Promise<{ error?: string }> {
  const auth = await authorize('sessao_propria:excluir')
  if (!auth.ok) return { error: auth.error }
  const user = auth.user
  const currentHash = await getCurrentSessionTokenHash()
  if (!currentHash) return { error: 'Sessão atual não encontrada.' }
  await pool.query(
    `DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2`,
    [user.id, currentHash],
  )
  revalidatePath(PATH)
  return {}
}
