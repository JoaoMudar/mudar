'use server'

import { redirect } from 'next/navigation'
import pool from '@/lib/db'
import { verifyPassword, createSession, getRequestMeta } from '@/lib/auth'

export interface LoginState {
  error: string | null
}

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

// Hash-fantasma (formato salt:hash valido, senha impossivel de casar). Quando o
// usuario nao existe, rodamos verifyPassword contra ele para gastar o mesmo tempo
// de scrypt — assim o tempo de resposta nao denuncia quais usuarios existem.
const PHANTOM_HASH =
  '00000000000000000000000000000000:' + 'f'.repeat(128)

// Registra a tentativa de login (sucesso ou falha). Nunca derruba o fluxo de
// login se a insercao falhar — auditoria e best-effort.
async function logLoginEvent(
  userId: string | null,
  username: string,
  success: boolean,
  ip: string | null,
  userAgent: string | null,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO login_events (user_id, username_attempted, success, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, username, success, ip, userAgent],
    )
  } catch {
    // ignora: auditoria nao deve bloquear o login
  }
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = formData.get('username')?.toString().trim().toLowerCase()
  const password = formData.get('password')?.toString()

  if (!username || !password) {
    return { error: 'Preencha todos os campos.' }
  }

  const { ip, userAgent } = await getRequestMeta()

  // Busca usuario
  const { rows } = await pool.query(
    `SELECT id, password_hash, failed_login_attempts, locked_until
     FROM users
     WHERE username = $1 AND active = true`,
    [username],
  )

  if (rows.length === 0) {
    // Gasta o mesmo tempo de um login real (anti-enumeracao por timing).
    await verifyPassword(password, PHANTOM_HASH)
    await logLoginEvent(null, username, false, ip, userAgent)
    return { error: 'Usuário ou senha incorretos.' }
  }

  const user = rows[0]

  // Checa bloqueio por tentativas
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    await logLoginEvent(user.id, username, false, ip, userAgent)
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
    await logLoginEvent(user.id, username, false, ip, userAgent)
    return { error: 'Usuário ou senha incorretos.' }
  }

  // Login OK — reseta contador, registra e cria sessao
  await pool.query(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
    [user.id],
  )
  await logLoginEvent(user.id, username, true, ip, userAgent)

  await createSession(user.id)
  redirect('/')
}
