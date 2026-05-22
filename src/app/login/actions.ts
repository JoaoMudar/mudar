'use server'

import { redirect } from 'next/navigation'
import pool from '@/lib/db'
import { hashPassword, verifyPassword, createSession } from '@/lib/auth'

export interface LoginState {
  error: string | null
}

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = formData.get('username')?.toString().trim().toLowerCase()
  const password = formData.get('password')?.toString()

  if (!username || !password) {
    return { error: 'Preencha todos os campos.' }
  }

  // Busca usuario
  const { rows } = await pool.query(
    `SELECT id, password_hash, failed_login_attempts, locked_until
     FROM users
     WHERE username = $1 AND active = true`,
    [username],
  )

  if (rows.length === 0) {
    return { error: 'Usuário ou senha incorretos.' }
  }

  const user = rows[0]

  // Checa bloqueio por tentativas
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minLeft = Math.ceil(
      (new Date(user.locked_until).getTime() - Date.now()) / 60000,
    )
    return {
      error: `Conta bloqueada. Tente novamente em ${minLeft} minuto${minLeft > 1 ? 's' : ''}.`,
    }
  }

  // Verifica senha
  const valid = await verifyPassword(password, user.password_hash)

  if (!valid) {
    const attempts = user.failed_login_attempts + 1
    if (attempts >= MAX_ATTEMPTS) {
      await pool.query(
        `UPDATE users
         SET failed_login_attempts = $1,
             locked_until = NOW() + INTERVAL '${LOCK_MINUTES} minutes'
         WHERE id = $2`,
        [attempts, user.id],
      )
    } else {
      await pool.query(
        `UPDATE users SET failed_login_attempts = $1 WHERE id = $2`,
        [attempts, user.id],
      )
    }
    return { error: 'Usuário ou senha incorretos.' }
  }

  // Login OK — reseta contador e cria sessao
  await pool.query(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
    [user.id],
  )

  await createSession(user.id)
  redirect('/')
}
