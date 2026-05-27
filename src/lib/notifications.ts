import pool from '@/lib/db'

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string | null
  link: string | null
  read: boolean
  created_at: string
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message?: string,
  link?: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, link)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, title, message ?? null, link ?? null],
  )
}

export async function notifyRole(
  role: string,
  type: string,
  title: string,
  message?: string,
  link?: string,
): Promise<void> {
  const { rows } = await pool.query(
    `SELECT id FROM users WHERE role = $1 AND active = true`,
    [role],
  )
  for (const user of rows) {
    await createNotification(user.id, type, title, message, link)
  }
}

export async function getUnreadNotifications(userId: string): Promise<Notification[]> {
  const { rows } = await pool.query(
    `SELECT id, user_id, type, title, message, link, read, created_at
     FROM notifications
     WHERE user_id = $1 AND read = false
     ORDER BY created_at DESC`,
    [userId],
  )
  return rows as Notification[]
}

export async function getNotifications(userId: string, limit = 20): Promise<Notification[]> {
  const { rows } = await pool.query(
    `SELECT id, user_id, type, title, message, link, read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  )
  return rows as Notification[]
}

// Escopa ao dono: impede que um usuario marque a notificacao de outro (IDOR).
export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  await pool.query(
    `UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2`,
    [notificationId, userId],
  )
}

export async function markAllAsRead(userId: string): Promise<void> {
  await pool.query(
    `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
    [userId],
  )
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read = false`,
    [userId],
  )
  return rows[0].count
}
