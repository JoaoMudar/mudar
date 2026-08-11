import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  normalizeName,
  normalizeIdentity,
  validateParty,
  upsertParty,
  addPartyRole,
  upsertPrimaryAddress,
  upsertPartyFromCustomer,
  upsertPartyFromSupplier,
  PARTY_ROLES,
  type Queryable,
} from '../parties'

// `parties.ts` e o unico ponto de escrita em cadastro.parties — se ele deixar a
// identidade divergir da copia em customers/suppliers, a divida deliberada do
// backfill deixa de ser controlada. Daí o teste cobrir tambem o SQL emitido.
function fakeDb() {
  const query = vi.fn().mockResolvedValue({ rows: [{ id: 'party-1' }] })
  return { db: { query } as unknown as Queryable, query }
}

describe('normalizeName', () => {
  it('apara espaços', () => expect(normalizeName('  Ipê  ')).toBe('Ipê'))
  it('vazio vira null', () => {
    expect(normalizeName('   ')).toBeNull()
    expect(normalizeName(null)).toBeNull()
    expect(normalizeName(undefined)).toBeNull()
  })
})

describe('normalizeIdentity', () => {
  it('reduz documento, telefone e whatsapp a dígitos', () => {
    const n = normalizeIdentity({
      name: 'João',
      document: '123.456.789-09',
      phone: '(47) 99999-8888',
      whatsapp: '+55 47 99999-8888',
    })
    expect(n.document).toBe('12345678909')
    expect(n.phone).toBe('47999998888')
    expect(n.whatsapp).toBe('5547999998888')
  })

  it('kind inválido vira null em vez de chutar', () => {
    // Chutar 'pf' para uma prefeitura seria pior que admitir que não se sabe.
    expect(normalizeIdentity({ name: 'X', kind: 'xx' as never }).kind).toBeNull()
    expect(normalizeIdentity({ name: 'X' }).kind).toBeNull()
  })

  it('strings vazias viram null', () => {
    const n = normalizeIdentity({ name: 'X', email: '  ', document: '', notes: '' })
    expect(n.email).toBeNull()
    expect(n.document).toBeNull()
    expect(n.notes).toBeNull()
  })

  it('active tem default true', () => {
    expect(normalizeIdentity({ name: 'X' }).active).toBe(true)
    expect(normalizeIdentity({ name: 'X', active: false }).active).toBe(false)
  })
})

describe('validateParty', () => {
  it('exige nome', () => {
    expect(validateParty({ name: '  ' })).toMatch(/nome/i)
    expect(validateParty({ name: 'Gilberto' })).toBeNull()
  })

  it('valida CPF quando kind é pf', () => {
    expect(validateParty({ name: 'X', kind: 'pf', document: '11111111111' })).toMatch(/CPF/)
    expect(validateParty({ name: 'X', kind: 'pf', document: '529.982.247-25' })).toBeNull()
  })

  it('valida CNPJ quando kind é pj', () => {
    expect(validateParty({ name: 'X', kind: 'pj', document: '11111111111111' })).toMatch(/CNPJ/)
    expect(validateParty({ name: 'X', kind: 'pj', document: '11.222.333/0001-81' })).toBeNull()
  })

  it('sem kind, aceita CPF ou CNPJ — o cadastro legado não preenchia o tipo', () => {
    expect(validateParty({ name: 'X', document: '52998224725' })).toBeNull()
    expect(validateParty({ name: 'X', document: '11222333000181' })).toBeNull()
    expect(validateParty({ name: 'X', document: '12345' })).toMatch(/Documento/)
  })

  it('sem documento não valida documento', () => {
    expect(validateParty({ name: 'X', kind: 'pj' })).toBeNull()
  })

  it('valida e-mail', () => {
    expect(validateParty({ name: 'X', email: 'nao-eh-email' })).toMatch(/mail/i)
    expect(validateParty({ name: 'X', email: 'a@b.com' })).toBeNull()
  })
})

describe('upsertParty', () => {
  let f: ReturnType<typeof fakeDb>
  beforeEach(() => {
    f = fakeDb()
  })

  it('sem id, insere e devolve o party_id', async () => {
    const id = await upsertParty(f.db, { name: 'Viveiro Vizinho' })
    expect(id).toBe('party-1')
    const [sql] = f.query.mock.calls[0]
    expect(sql).toContain('INSERT INTO cadastro.parties')
  })

  it('com id, atualiza em vez de inserir', async () => {
    await upsertParty(f.db, { id: 'party-9', name: 'Novo nome' })
    const [sql, params] = f.query.mock.calls[0]
    expect(sql).toContain('UPDATE cadastro.parties')
    expect(params.at(-1)).toBe('party-9')
    expect(f.query).toHaveBeenCalledTimes(1)
  })

  it('o UPDATE usa COALESCE — o formulário de um papel não apaga o do outro', async () => {
    // O cadastro de fornecedor não tem documento; gravar NULL ali apagaria o
    // CNPJ que o cadastro de cliente preencheu para a mesma pessoa.
    await upsertParty(f.db, { id: 'party-9', name: 'X' })
    const [sql] = f.query.mock.calls[0]
    expect(sql).toContain('COALESCE($2, document)')
    expect(sql).toContain('COALESCE($4, legal_name)')
  })

  it('id inexistente cai para INSERT com o mesmo id, sem travar o cadastro', async () => {
    f.query
      .mockResolvedValueOnce({ rows: [] }) // UPDATE não achou
      .mockResolvedValueOnce({ rows: [{ id: 'party-9' }] })
    const id = await upsertParty(f.db, { id: 'party-9', name: 'X' })
    expect(id).toBe('party-9')
    expect(f.query.mock.calls[1][0]).toContain('INSERT INTO cadastro.parties')
  })

  it('recusa identidade inválida antes de tocar o banco', async () => {
    await expect(upsertParty(f.db, { name: '' })).rejects.toThrow(/nome/i)
    await expect(
      upsertParty(f.db, { name: 'X', kind: 'pf', document: '111' }),
    ).rejects.toThrow(/CPF/)
    expect(f.query).not.toHaveBeenCalled()
  })

  it('grava o documento só com dígitos', async () => {
    await upsertParty(f.db, { name: 'X', kind: 'pj', document: '11.222.333/0001-81' })
    const [, params] = f.query.mock.calls[0]
    expect(params[1]).toBe('11222333000181')
  })
})

describe('addPartyRole', () => {
  it('é idempotente (ON CONFLICT DO NOTHING)', async () => {
    const f = fakeDb()
    await addPartyRole(f.db, 'party-1', 'fornecedor')
    const [sql, params] = f.query.mock.calls[0]
    expect(sql).toContain('ON CONFLICT (party_id, role) DO NOTHING')
    expect(params).toEqual(['party-1', 'fornecedor'])
  })

  it('a lista de papéis é a do banco', () => {
    expect(PARTY_ROLES).toEqual([
      'cliente', 'fornecedor', 'funcionario', 'socio', 'familiar',
      'banco', 'governo', 'contador', 'outro',
    ])
  })
})

describe('upsertPrimaryAddress', () => {
  it('não grava endereço vazio', async () => {
    const f = fakeDb()
    await upsertPrimaryAddress(f.db, 'party-1', {})
    expect(f.query).not.toHaveBeenCalled()
  })

  it('atualiza o principal quando já existe', async () => {
    const f = fakeDb()
    await upsertPrimaryAddress(f.db, 'party-1', { city: 'Rio do Sul' })
    expect(f.query).toHaveBeenCalledTimes(1)
    expect(f.query.mock.calls[0][0]).toContain('UPDATE cadastro.addresses')
  })

  it('insere quando não existe principal', async () => {
    const f = fakeDb()
    f.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] })
    await upsertPrimaryAddress(f.db, 'party-1', { city: 'Rio do Sul' })
    expect(f.query.mock.calls[1][0]).toContain('INSERT INTO cadastro.addresses')
  })

  it('normaliza CEP para dígitos e UF para maiúscula', async () => {
    const f = fakeDb()
    await upsertPrimaryAddress(f.db, 'party-1', { zip_code: '89.160-000', state: 'sc' })
    const [, params] = f.query.mock.calls[0]
    expect(params[1]).toBe('89160000')
    expect(params[7]).toBe('SC')
  })
})

describe('atalhos por papel', () => {
  it('cliente: identidade, papel e endereço na mesma transação', async () => {
    const f = fakeDb()
    await upsertPartyFromCustomer(f.db, { name: 'Prefeitura', city: 'Ibirama' })
    const sqls = f.query.mock.calls.map((c) => c[0] as string)
    expect(sqls[0]).toContain('cadastro.parties')
    expect(sqls[1]).toContain('cadastro.party_roles')
    expect(f.query.mock.calls[1][1]).toEqual(['party-1', 'cliente'])
    expect(sqls[2]).toContain('cadastro.addresses')
  })

  it('fornecedor: mesmo fluxo, papel fornecedor', async () => {
    const f = fakeDb()
    await upsertPartyFromSupplier(f.db, { name: 'Viveiro Vizinho', city: 'Rio do Sul' })
    expect(f.query.mock.calls[1][1]).toEqual(['party-1', 'fornecedor'])
  })

  it('a mesma pessoa acumula papéis sem virar dois cadastros', async () => {
    const f = fakeDb()
    await upsertPartyFromCustomer(f.db, { id: 'party-1', name: 'Márcio' })
    await upsertPartyFromSupplier(f.db, { id: 'party-1', name: 'Márcio' })
    const papeis = f.query.mock.calls
      .filter((c) => (c[0] as string).includes('party_roles'))
      .map((c) => (c[1] as string[])[1])
    expect(papeis).toEqual(['cliente', 'fornecedor'])
  })
})
