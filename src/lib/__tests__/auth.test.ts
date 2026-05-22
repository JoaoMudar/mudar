import { describe, it, expect, vi } from 'vitest'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/db', () => ({ default: { query: vi.fn() } }))

import { hashPassword, verifyPassword } from '../auth'

describe('hashPassword', () => {
  it('retorna string no formato salt:hash', async () => {
    const result = await hashPassword('minha-senha-123')
    expect(result).toContain(':')
    const [salt, hash] = result.split(':')
    expect(salt).toHaveLength(32) // 16 bytes hex
    expect(hash).toHaveLength(128) // 64 bytes hex
  })

  it('gera hashes diferentes para a mesma senha (salt aleatorio)', async () => {
    const hash1 = await hashPassword('mesma-senha')
    const hash2 = await hashPassword('mesma-senha')
    expect(hash1).not.toBe(hash2)
  })
})

describe('verifyPassword', () => {
  it('retorna true para senha correta', async () => {
    const stored = await hashPassword('senha-correta')
    const result = await verifyPassword('senha-correta', stored)
    expect(result).toBe(true)
  })

  it('retorna false para senha incorreta', async () => {
    const stored = await hashPassword('senha-correta')
    const result = await verifyPassword('senha-errada', stored)
    expect(result).toBe(false)
  })

  it('retorna false para senha vazia', async () => {
    const stored = await hashPassword('senha-real')
    const result = await verifyPassword('', stored)
    expect(result).toBe(false)
  })
})
