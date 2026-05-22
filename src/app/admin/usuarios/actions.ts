'use server'

import { revalidatePath } from 'next/cache'
import pool from '@/lib/db'
import { hashPassword, requireRole } from '@/lib/auth'

const PATH = '/admin/usuarios'

export interface UserPayload {
  username: string
  display_name: string
  password?: string
  role: 'admin' | 'chefia' | 'gerencia' | 'funcionario'
}

export async function createUsuario(data: UserPayload): Promise<{ error?: string }> {
  await requireRole('admin')

  if (!data.password || data.password.length < 6) {
    return { error: 'Senha deve ter no mínimo 6 caracteres.' }
  }

  try {
    const passwordHash = await hashPassword(data.password)
    await pool.query(
      `INSERT INTO users (username, display_name, password_hash, role)
       VALUES ($1, $2, $3, $4)`,
      [data.username.trim().toLowerCase(), data.display_name.trim(), passwordHash, data.role],
    )
  } catch (e: unknown) {
    const msg = (e as Error).message
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return { error: 'Este nome de usuário já existe.' }
    }
    return { error: msg }
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
    return { error: msg }
  }
  revalidatePath(PATH)
  return {}
}

export async function resetSenha(
  id: string,
  newPassword: string,
): Promise<{ error?: string }> {
  await requireRole('admin')

  if (newPassword.length < 6) {
    return { error: 'Senha deve ter no mínimo 6 caracteres.' }
  }

  try {
    const passwordHash = await hashPassword(newPassword)
    await pool.query(
      `UPDATE users SET password_hash=$1, failed_login_attempts=0, locked_until=NULL WHERE id=$2`,
      [passwordHash, id],
    )
  } catch (e: unknown) {
    return { error: (e as Error).message }
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
    return { error: (e as Error).message }
  }
  revalidatePath(PATH)
  return {}
}
