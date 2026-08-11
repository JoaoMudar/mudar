// @vitest-environment jsdom
//
// A fila offline e o caminho pelo qual o dado de campo entra no sistema — e
// ate agora era o unico modulo critico sem nenhum teste. Precisa de jsdom
// (o vitest.config.ts usa `node`, que nao tem IndexedDB) e de fake-indexeddb,
// que implementa a API em memoria.
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { enqueue, getAll, remove, count, type QueuedUsage } from '../offline-queue'

function usage(id: string, over: Partial<QueuedUsage> = {}): Omit<QueuedUsage, 'queued_at'> {
  return {
    id,
    input_id: 'input-1',
    species_id: 'species-1',
    container_id: 'container-1',
    quantity: 2.5,
    usage_date: '2026-08-11',
    ...over,
  }
}

beforeEach(async () => {
  for (const item of await getAll()) await remove(item.id)
})

describe('offline-queue', () => {
  it('guarda e devolve o registro enfileirado', async () => {
    await enqueue(usage('11111111-1111-1111-1111-111111111111'))

    const all = await getAll()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({
      id: '11111111-1111-1111-1111-111111111111',
      input_id: 'input-1',
      quantity: 2.5,
      usage_date: '2026-08-11',
    })
  })

  it('carimba queued_at no momento do enfileiramento', async () => {
    await enqueue(usage('22222222-2222-2222-2222-222222222222'))
    const [item] = await getAll()
    expect(new Date(item.queued_at).getTime()).not.toBeNaN()
  })

  it('preserva o id fornecido — e ele que vira o client_id no servidor', async () => {
    // Se a fila gerasse o id por conta propria, o registro que ja chegou ao
    // servidor (mas cuja resposta se perdeu) seria reenviado com outra chave e
    // o ON CONFLICT nao teria como descartar: viraria consumo duplicado.
    const id = '33333333-3333-3333-3333-333333333333'
    await enqueue(usage(id))
    const [item] = await getAll()
    expect(item.id).toBe(id)
  })

  it('enfileirar o mesmo id duas vezes sobrescreve em vez de lancar', async () => {
    const id = '44444444-4444-4444-4444-444444444444'
    await enqueue(usage(id, { quantity: 1 }))
    await expect(enqueue(usage(id, { quantity: 9 }))).resolves.toBeUndefined()

    const all = await getAll()
    expect(all).toHaveLength(1)
    expect(all[0].quantity).toBe(9)
  })

  it('remove tira o item da fila', async () => {
    const id = '55555555-5555-5555-5555-555555555555'
    await enqueue(usage(id))
    await remove(id)
    expect(await getAll()).toHaveLength(0)
  })

  it('remover id inexistente nao lanca', async () => {
    await expect(remove('66666666-6666-6666-6666-666666666666')).resolves.toBeUndefined()
  })

  it('count acompanha o tamanho da fila', async () => {
    expect(await count()).toBe(0)
    await enqueue(usage('77777777-7777-7777-7777-777777777777'))
    await enqueue(usage('88888888-8888-8888-8888-888888888888'))
    expect(await count()).toBe(2)
  })

  it('mantem varios registros independentes na fila', async () => {
    await enqueue(usage('99999999-9999-9999-9999-999999999999', { species_id: 'species-A' }))
    await enqueue(usage('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', { species_id: 'species-B' }))

    const ids = (await getAll()).map((i) => i.species_id).sort()
    expect(ids).toEqual(['species-A', 'species-B'])
  })
})
