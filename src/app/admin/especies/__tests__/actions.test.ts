import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db', () => ({ default: { query: vi.fn() } }))
vi.mock('@/lib/auth', () => ({ requireRole: vi.fn() }))
vi.mock('fs/promises', () => ({ writeFile: vi.fn() }))
// sharp mockado: a cadeia .rotate().resize().webp().toBuffer() rejeita,
// simulando "arquivo enviado nao e uma imagem valida".
vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    rotate() {
      return this
    },
    resize() {
      return this
    },
    webp() {
      return this
    },
    toBuffer: vi.fn().mockRejectedValue(new Error('unsupported image format')),
  })),
}))

import pool from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createEspecie, uploadEspecieFoto, type SpeciesPayload } from '../actions'

const mockedQuery = pool.query as unknown as ReturnType<typeof vi.fn>
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>

const validSpecies: SpeciesPayload = {
  common_name: 'Ipê-amarelo',
  scientific_name: 'Handroanthus albus',
  category: 'madeira',
  germination_time_days: null,
  growth_time_months: null,
  notes: '',
  photo_url: '',
  active: true,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createEspecie — guarda de autorização', () => {
  it('não toca o banco quando requireRole nega', async () => {
    mockedRequireRole.mockRejectedValueOnce(new Error('NEXT_REDIRECT'))
    await expect(createEspecie(validSpecies)).rejects.toThrow()
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('insere quando autorizado', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    mockedQuery.mockResolvedValueOnce({ rows: [] })
    const res = await createEspecie(validSpecies)
    expect(res).toEqual({})
    expect(mockedQuery).toHaveBeenCalledTimes(1)
  })
})

describe('uploadEspecieFoto — autorização e validação', () => {
  it('nega antes de qualquer escrita quando requireRole nega', async () => {
    mockedRequireRole.mockRejectedValueOnce(new Error('redirect'))
    await expect(uploadEspecieFoto(new FormData())).rejects.toThrow()
  })

  it('rejeita quando nenhum arquivo é enviado', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    const res = await uploadEspecieFoto(new FormData())
    expect(res).toMatchObject({ error: expect.stringMatching(/nenhum/i) })
  })

  it('rejeita arquivo acima do teto de 8MB', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    const fd = new FormData()
    fd.set('file', new File([new Uint8Array(9 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' }))
    const res = await uploadEspecieFoto(fd)
    expect(res).toMatchObject({ error: expect.stringMatching(/grande/i) })
  })

  it('rejeita arquivo que não é imagem válida (sharp lança)', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    const fd = new FormData()
    fd.set('file', new File([new Uint8Array(64)], 'evil.svg', { type: 'image/svg+xml' }))
    const res = await uploadEspecieFoto(fd)
    expect(res).toMatchObject({ error: expect.stringMatching(/inválido|imagem/i) })
  })
})
