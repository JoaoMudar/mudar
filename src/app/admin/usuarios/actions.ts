'use server'

import { revalidatePath } from 'next/cache'
import pool from '@/lib/db'
import { hashPassword, requireRole } from '@/lib/auth'
import { validatePassword } from '@/lib/password-policy'
import { safeErrorMessage } from '@/lib/action-errors'

const PATH = '/admin/usuarios'

export interface UserPayload {
  username: string
  display_name: string
  password?: string
  role: 'admin' | 'chefia' | 'gerencia' | 'colaborador'
}

export async function createUsuario(data: UserPayload): Promise<{ error?: string }> {
  await requireRole('admin')

  const password = data.password ?? ''
  const pwError = validatePassword(password)
  if (pwError) return { error: pwError }

  try {
    const passwordHash = await hashPassword(password)
    // must_change_password = true: a senha definida pelo admin e temporaria,
    // o usuario troca por uma propria no primeiro acesso.
    await pool.query(
      `INSERT INTO users (username, display_name, password_hash, role, must_change_password)
       VALUES ($1, $2, $3, $4, true)`,
      [data.username.trim().toLowerCase(), data.display_name.trim(), passwordHash, data.role],
    )
  } catch (e: unknown) {
    const msg = (e as Error).message
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return { error: 'Este nome de usuário já existe.' }
    }
    return { error: safeErrorMessage(e, 'Não foi possível criar o usuário. Tente novamente.', 'createUsuario') }
  }
  revalidatePath(PATH)
  return {}
}

export async function updateUsuario(
  id: string,
  data: Omit<UserPayload, 'password'>,
): Promise<{ error?: string }> {
  await requireRole('admin')

  try {
    await pool.query(
      `UPDATE users SET username=$1, display_name=$2, role=$3 WHERE id=$4`,
      [data.username.trim().toLowerCase(), data.display_name.trim(), data.role, id],
    )
  } catch (e: unknown) {
    const msg = (e as Error).message
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return { error: 'Este nome de usuário já existe.' }
    }
    return { error: safeErrorMessage(e, 'Não foi possível salvar o usuário. Tente novamente.', 'updateUsuario') }
  }
  revalidatePath(PATH)
  return {}
}

export async function resetSenha(
  id: string,
  newPassword: string,
): Promise<{ error?: string }> {
  await requireRole('admin')

  const pwError = validatePassword(newPassword)
  if (pwError) return { error: pwError }

  try {
    const passwordHash = await hashPassword(newPassword)
    await pool.query(
      `UPDATE users SET password_hash=$1, failed_login_attempts=0, locked_until=NULL,
              must_change_password=true WHERE id=$2`,
      [passwordHash, id],
    )
    // Reset por suspeita de invasao deve derrubar o atacante: encerra todas as
    // sessoes do usuario (ele faz novo login e e obrigado a trocar a senha).
    await pool.query(`DELETE FROM sessions WHERE user_id=$1`, [id])
  } catch (e: unknown) {
    return { error: safeErrorMessage(e, 'Não foi possível redefinir a senha. Tente novamente.', 'resetSenha') }
  }
  revalidatePath(PATH)
  return {}
}

export async function toggleUsuarioAtivo(
  id: string,
  active: boolean,
): Promise<{ error?: string }> {
  await requireRole('admin')

  try {
    await pool.query(`UPDATE users SET active=$1 WHERE id=$2`, [active, id])
    // Se desativando, remove todas as sessoes do usuario
    if (!active) {
      await pool.query(`DELETE FROM sessions WHERE user_id=$1`, [id])
    }
  } catch (e: unknown) {
    return { error: safeErrorMessage(e, 'Não foi possível alterar a situação do usuário. Tente novamente.', 'toggleUsuarioAtivo') }
  }
  revalidatePath(PATH)
  return {}
}
