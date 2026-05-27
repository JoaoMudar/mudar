'use server'

import { redirect } from 'next/navigation'
import pool from '@/lib/db'
import {
  getSession,
  verifyPassword,
  hashPassword,
  getCurrentSessionTokenHash,
} from '@/lib/auth'
import { validatePassword } from '@/lib/password-policy'

export interface ChangePasswordState {
  error: string | null
}

export async function changeOwnPassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  // getSession (nao requireAuth) para nao cair em loop de redirect com
  // must_change_password — esta e justamente a tela que zera a flag.
  const user = await getSession()
  if (!user) redirect('/login')

  const current = formData.get('current_password')?.toString() ?? ''
  const next = formData.get('new_password')?.toString() ?? ''
  const confirm = formData.get('confirm_password')?.toString() ?? ''

  if (!current || !next || !confirm) {
    return { error: 'Preencha todos os campos.' }
  }
  if (next !== confirm) {
    return { error: 'A confirmação não bate com a nova senha.' }
  }

  const pwError = validatePassword(next)
  if (pwError) return { error: pwError }

  const { rows } = await pool.query(
    `SELECT password_hash FROM users WHERE id = $1`,
    [user.id],
  )
  if (rows.length === 0) redirect('/login')

  const valid = await verifyPassword(current, rows[0].password_hash)
  if (!valid) return { error: 'Senha atual incorreta.' }

  const sameAsOld = await verifyPassword(next, rows[0].password_hash)
  if (sameAsOld) return { error: 'A nova senha deve ser diferente da atual.' }

  const newHash = await hashPassword(next)
  const currentHash = await getCurrentSessionTokenHash()

  await pool.query(
    `UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2`,
    [newHash, user.id],
  )

  // Trocar a senha invalida logins antigos: encerra as OUTRAS sessoes e mantem
  // a atual (o aparelho que acabou de trocar continua logado).
  if (currentHash) {
    await pool.query(
      `DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2`,
      [user.id, currentHash],
    )
  }

  redirect('/')
}
