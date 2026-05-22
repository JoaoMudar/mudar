import { scrypt, randomBytes, createHash, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import pool from '@/lib/db'

const scryptAsync = promisify(scrypt)

const SESSION_COOKIE = 'session_token'
const SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60 // 90 dias

export interface User {
  id: string
  username: string
  display_name: string
  role: 'admin' | 'chefia' | 'gerencia' | 'funcionario'
}

// --- Password ---

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${hash.toString('hex')}`
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, hash] = stored.split(':')
  const hashBuffer = Buffer.from(hash, 'hex')
  const derived = (await scryptAsync(password, salt, 64)) as Buffer
  return timingSafeEqual(hashBuffer, derived)
}

// --- Token hashing ---

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// --- Session ---

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)

  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  )

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const tokenHash = hashToken(token)

  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.expires_at > NOW()
       AND u.active = true`,
    [tokenHash],
  )

  if (rows.length === 0) return null

  // Atualiza last_seen_at a cada 1h para nao sobrecarregar com writes
  await pool.query(
    `UPDATE sessions SET last_seen_at = NOW()
     WHERE token_hash = $1 AND last_seen_at < NOW() - INTERVAL '1 hour'`,
    [tokenHash],
  )

  // Limpeza lazy de sessoes expiradas (1 em 100 requests)
  if (Math.random() < 0.01) {
    pool.query(`DELETE FROM sessions WHERE expires_at < NOW()`).catch(() => {})
  }

  return rows[0] as User
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (token) {
    const tokenHash = hashToken(token)
    await pool.query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash])
  }

  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

// --- Guards ---

export async function requireAuth(): Promise<User> {
  const user = await getSession()
  if (!user) redirect('/login')
  return user
}

export async function requireRole(
  ...roles: User['role'][]
): Promise<User> {
  const user = await requireAuth()
  if (!roles.includes(user.role)) redirect('/')
  return user
}
