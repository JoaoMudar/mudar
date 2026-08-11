import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db', () => ({ default: { query: vi.fn(), connect: vi.fn() } }))
vi.mock('@/lib/auth', () => ({ requireRole: vi.fn() }))
// sharp mockado. Por padrao a cadeia .rotate().resize().webp().toBuffer()
// rejeita, simulando "arquivo enviado nao e uma imagem valida"; um teste pode
// sobrescrever com mockResolvedValueOnce para exercitar o caminho feliz.
const { sharpToBuffer } = vi.hoisted(() => ({ sharpToBuffer: vi.fn() }))
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
    toBuffer: sharpToBuffer,
  })),
}))

import pool from '@/lib/db'
import { requireRole } from '@/lib/auth'
import {
  createEspecie,
  createSpeciesQuick,
  updateEspecie,
  addPopularName,
  removePopularName,
  setMainPopularName,
  uploadEspecieFoto,
  type SpeciesPayload,
} from '../actions'

const mockedQuery = pool.query as unknown as ReturnType<typeof vi.fn>
const mockedConnect = pool.connect as unknown as ReturnType<typeof vi.fn>
const mockedRequireRole = requireRole as unknown as ReturnType<typeof vi.fn>

const validSpecies: SpeciesPayload = {
  common_name: 'Ipê-amarelo',
  scientific_name: 'Handroanthus albus',
  tags: ['nativa', 'frutifera'],
  germination_time_days: null,
  growth_time_months: null,
  notes: '',
  photo_url: '',
  active: true,
}

/**
 * Enfileira as duas queries de loadKnownNames (especies + sinonimos),
 * na ordem em que a action as dispara.
 */
function queueKnownNames(
  species: { id: string; common_name: string }[] = [],
  synonyms: { species_id: string; name: string; common_name: string }[] = [],
) {
  mockedQuery.mockResolvedValueOnce({ rows: species })
  mockedQuery.mockResolvedValueOnce({ rows: synonyms })
}

beforeEach(() => {
  vi.clearAllMocks()
  sharpToBuffer.mockRejectedValue(new Error('unsupported image format'))
})

describe('createEspecie — guarda de autorização', () => {
  it('não toca o banco quando requireRole nega', async () => {
    mockedRequireRole.mockRejectedValueOnce(new Error('NEXT_REDIRECT'))
    await expect(createEspecie(validSpecies)).rejects.toThrow()
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('insere quando autorizado, passando as tags como text[]', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    queueKnownNames()
    mockedQuery.mockResolvedValueOnce({ rows: [] }) // sem duplicata de científico
    mockedQuery.mockResolvedValueOnce({ rows: [] }) // INSERT
    const res = await createEspecie(validSpecies)
    expect(res).toEqual({})
    const [sql, params] = mockedQuery.mock.calls.at(-1)!
    expect(sql).toContain('INSERT INTO species')
    expect(sql).toContain('tags')
    expect(params).toContain(validSpecies.tags)
  })

  it('bloqueia nome popular que já pertence a outra espécie (sem inserir)', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    queueKnownNames([{ id: 'sp-9', common_name: 'Ipe amarelo' }])
    const res = await createEspecie(validSpecies)
    expect(res).toMatchObject({ error: expect.stringContaining('Ipe amarelo') })
    expect(mockedQuery).toHaveBeenCalledTimes(2) // só o loadKnownNames
  })

  it('bloqueia nome científico duplicado', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    queueKnownNames()
    mockedQuery.mockResolvedValueOnce({ rows: [{ common_name: 'Outra espécie' }] })
    const res = await createEspecie(validSpecies)
    expect(res).toMatchObject({ error: expect.stringContaining('Outra espécie') })
    expect(mockedQuery).toHaveBeenCalledTimes(3)
  })
})

describe('updateEspecie — conflito de nomes', () => {
  it('manter o próprio nome não é conflito (excludeSpeciesId)', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    queueKnownNames([{ id: 'sp-1', common_name: 'Ipê-amarelo' }])
    mockedQuery.mockResolvedValueOnce({ rows: [] }) // sem duplicata de científico
    mockedQuery.mockResolvedValueOnce({ rows: [] }) // UPDATE
    const res = await updateEspecie('sp-1', validSpecies)
    expect(res).toEqual({})
    const [sql] = mockedQuery.mock.calls.at(-1)!
    expect(sql).toContain('UPDATE species')
  })

  it('bloqueia renomear para sinônimo de outra espécie', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    queueKnownNames(
      [{ id: 'sp-1', common_name: 'Outro nome' }],
      [{ species_id: 'sp-2', name: 'Ipe Amarelo', common_name: 'Aipê' }],
    )
    const res = await updateEspecie('sp-1', validSpecies)
    expect(res).toMatchObject({ error: expect.stringContaining('Aipê') })
    expect(mockedQuery).toHaveBeenCalledTimes(2)
  })
})

describe('createSpeciesQuick — cadastro rápido', () => {
  it('não toca o banco quando requireRole nega', async () => {
    mockedRequireRole.mockRejectedValueOnce(new Error('NEXT_REDIRECT'))
    await expect(createSpeciesQuick('Cereja-do-rio-grande')).rejects.toThrow()
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('rejeita nome vazio sem tocar o banco', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    const res = await createSpeciesQuick('   ')
    expect(res).toMatchObject({ error: expect.stringMatching(/nome/i) })
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('cria sem categoria e retorna o id', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    queueKnownNames()
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'sp-1' }] })
    const res = await createSpeciesQuick('Cereja-do-rio-grande')
    expect(res).toEqual({ id: 'sp-1' })
    const [sql] = mockedQuery.mock.calls.at(-1)!
    expect(sql).toContain('INSERT INTO species')
    expect(sql).not.toContain('category')
  })

  it('retorna a espécie existente quando o nome já é sinônimo (sem criar)', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    queueKnownNames([], [{ species_id: 'sp-2', name: 'Caroba', common_name: 'Jacarandá' }])
    const res = await createSpeciesQuick('caroba')
    expect(res).toEqual({ existing: { id: 'sp-2', common_name: 'Jacarandá' } })
    expect(mockedQuery).toHaveBeenCalledTimes(2)
  })

  it('retorna a espécie existente quando o nome já é principal de outra', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    queueKnownNames([{ id: 'sp-3', common_name: 'Ipê-Roxo' }])
    const res = await createSpeciesQuick('ipe roxo')
    expect(res).toEqual({ existing: { id: 'sp-3', common_name: 'Ipê-Roxo' } })
  })
})

describe('addPopularName — sinônimos', () => {
  it('não toca o banco quando requireRole nega', async () => {
    mockedRequireRole.mockRejectedValueOnce(new Error('NEXT_REDIRECT'))
    await expect(addPopularName('sp-1', 'Caroba')).rejects.toThrow()
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('rejeita nome vazio sem tocar o banco', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    const res = await addPopularName('sp-1', '  ')
    expect(res).toMatchObject({ error: expect.stringMatching(/nome/i) })
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('bloqueia nome que já pertence a outra espécie, citando a dona', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    queueKnownNames([{ id: 'sp-2', common_name: 'Jacarandá' }])
    const res = await addPopularName('sp-1', 'jacaranda')
    expect(res).toMatchObject({ error: expect.stringContaining('Jacarandá') })
    expect(mockedQuery).toHaveBeenCalledTimes(2)
  })

  it('insere com name_normalized e retorna o id', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    queueKnownNames()
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'n-1' }] })
    const res = await addPopularName('sp-1', ' Ipê-Roxo ')
    expect(res).toEqual({ id: 'n-1' })
    const [sql, params] = mockedQuery.mock.calls.at(-1)!
    expect(sql).toContain('species_popular_names')
    expect(params).toEqual(['sp-1', 'Ipê-Roxo', 'ipe roxo'])
  })

  it('traduz violação de UNIQUE (corrida) em mensagem amigável', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    queueKnownNames()
    mockedQuery.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: '23505' }))
    const res = await addPopularName('sp-1', 'Caroba')
    expect(res).toMatchObject({ error: expect.stringMatching(/já está cadastrado/i) })
  })
})

describe('removePopularName', () => {
  it('deleta pelo id', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    mockedQuery.mockResolvedValueOnce({ rows: [] })
    const res = await removePopularName('n-1')
    expect(res).toEqual({})
    const [sql, params] = mockedQuery.mock.calls[0]
    expect(sql).toContain('DELETE FROM species_popular_names')
    expect(params).toEqual(['n-1'])
  })
})

describe('setMainPopularName — swap transacional', () => {
  function makeClient() {
    return { query: vi.fn(), release: vi.fn() }
  }

  it('troca o sinônimo com o common_name e commita', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    const client = makeClient()
    mockedConnect.mockResolvedValueOnce(client)
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 'n-1', species_id: 'sp-1', name: 'Caroba', common_name: 'Jacarandá' }],
      })
      .mockResolvedValueOnce({}) // UPDATE species
      .mockResolvedValueOnce({}) // UPDATE species_popular_names
      .mockResolvedValueOnce({}) // COMMIT

    const res = await setMainPopularName('n-1')
    expect(res).toEqual({})

    const calls = client.query.mock.calls
    expect(calls[0][0]).toBe('BEGIN')
    expect(calls[2][0]).toContain('UPDATE species SET common_name')
    expect(calls[2][1]).toEqual(['Caroba', 'sp-1'])
    expect(calls[3][0]).toContain('UPDATE species_popular_names')
    expect(calls[3][1]).toEqual(['Jacarandá', 'jacaranda', 'n-1'])
    expect(calls[4][0]).toBe('COMMIT')
    expect(client.release).toHaveBeenCalled()
  })

  it('sinônimo inexistente: faz rollback e retorna erro', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    const client = makeClient()
    mockedConnect.mockResolvedValueOnce(client)
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({}) // ROLLBACK

    const res = await setMainPopularName('n-x')
    expect(res).toMatchObject({ error: expect.stringMatching(/não encontrado/i) })
    expect(client.query.mock.calls.at(-1)![0]).toBe('ROLLBACK')
    expect(client.release).toHaveBeenCalled()
  })

  it('erro no meio da transação: faz rollback e libera a conexão', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    const client = makeClient()
    mockedConnect.mockResolvedValueOnce(client)
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 'n-1', species_id: 'sp-1', name: 'Caroba', common_name: 'Jacarandá' }],
      })
      .mockRejectedValueOnce(new Error('boom')) // UPDATE species falha
      .mockResolvedValueOnce({}) // ROLLBACK

    const res = await setMainPopularName('n-1')
    expect(res).toMatchObject({ error: expect.any(String) })
    expect(client.query.mock.calls.at(-1)![0]).toBe('ROLLBACK')
    expect(client.release).toHaveBeenCalled()
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

  it('grava a imagem no banco e devolve a URL de /api/fotos', async () => {
    mockedRequireRole.mockResolvedValueOnce(undefined)
    const webp = Buffer.from([1, 2, 3])
    sharpToBuffer.mockResolvedValueOnce(webp)
    mockedQuery.mockResolvedValueOnce({
      rows: [{ id: '11111111-2222-3333-4444-555555555555' }],
    })

    const fd = new FormData()
    fd.set('file', new File([new Uint8Array(64)], 'muda.jpg', { type: 'image/jpeg' }))
    const res = await uploadEspecieFoto(fd)

    // O contrato de URL importa: e o valor que vai para species.photo_url e que
    // os tres pontos de renderizacao passam para <Image>.
    expect(res).toEqual({ url: '/api/fotos/11111111-2222-3333-4444-555555555555' })

    const [sql, params] = mockedQuery.mock.calls[0]
    expect(sql).toContain('INSERT INTO species_photos')
    expect(params[0]).toBe(webp)
    expect(params[1]).toBe(webp.length)
  })
})
