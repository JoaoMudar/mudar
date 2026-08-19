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
  findPartyMatch,
  listParties,
  mergeParties,
  fillOnly,
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
  })

  it('chave ausente continua ausente; chave vazia vira null', () => {
    // A distinção que impede a divergência: `undefined` é "este formulário não
    // conhece o campo" (o de fornecedor não tem documento) e preserva o que já
    // existe; `null` é "o usuário apagou" e grava NULL.
    const ausente = normalizeIdentity({ name: 'X' })
    expect(ausente.kind).toBeUndefined()
    expect(ausente.document).toBeUndefined()
    expect(ausente.email).toBeUndefined()

    const apagado = normalizeIdentity({ name: 'X', document: '', email: null })
    expect(apagado.document).toBeNull()
    expect(apagado.email).toBeNull()
  })

  it('strings vazias viram null', () => {
    const n = normalizeIdentity({ name: 'X', email: '  ', document: '', notes: '' })
    expect(n.email).toBeNull()
    expect(n.document).toBeNull()
    expect(n.notes).toBeNull()
  })

  it('active só aparece quando quem chama informa', () => {
    // Ninguém passa `active` hoje. Deixá-lo ausente evita que salvar um cadastro
    // reative sem querer a identidade de alguém arquivado.
    expect(normalizeIdentity({ name: 'X' }).active).toBeUndefined()
    expect(normalizeIdentity({ name: 'X', active: false }).active).toBe(false)
    expect(normalizeIdentity({ name: 'X', active: true }).active).toBe(true)
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

  it('o UPDATE só toca nas colunas que quem chama conhece', async () => {
    // O cadastro de fornecedor não tem documento; gravar NULL ali apagaria o
    // CNPJ que o cadastro de cliente preencheu para a mesma pessoa. A coluna
    // simplesmente não entra no comando.
    await upsertParty(f.db, { id: 'party-9', name: 'X' })
    const [sql, params] = f.query.mock.calls[0]
    expect(sql).toContain('UPDATE cadastro.parties SET name = $1')
    expect(sql).not.toContain('document')
    expect(sql).not.toContain('legal_name')
    expect(params).toEqual(['X', 'party-9'])
  })

  it('campo esvaziado na tela vira NULL no banco', async () => {
    // O outro lado da moeda: apagar o telefone em /clientes tem de apagar
    // também em parties, senão o valor errado sobrevive na identidade.
    await upsertParty(f.db, { id: 'party-9', name: 'X', phone: '', email: null })
    const [sql, params] = f.query.mock.calls[0]
    expect(sql).toContain('phone =')
    expect(sql).toContain('email =')
    expect(params).toEqual(['X', null, null, 'party-9'])
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

// ---------------------------------------------------------------------------
// A regra que faltava: procurar antes de criar.
//
// O backfill da migration 20260811000004 casou cliente e fornecedor uma vez.
// Sem isto aqui, todo cadastro novo volta a criar uma identidade separada — e a
// duplicidade que o schema `cadastro` existe para impedir reaparece sozinha.
// ---------------------------------------------------------------------------
describe('findPartyMatch', () => {
  const achou = (over: Record<string, unknown> = {}) => ({
    rows: [{ id: 'party-f', name: 'Márcio Kuhar', active: true, roles: ['fornecedor'], ...over }],
  })

  it('acha por documento e marca a origem do casamento', async () => {
    const f = fakeDb()
    f.query.mockResolvedValueOnce(achou())
    const m = await findPartyMatch(f.db, { document: '123.456.789-09', name: 'Outro', role: 'cliente' })
    expect(m?.id).toBe('party-f')
    expect(m?.matchedBy).toBe('document')
    expect(m?.roles).toEqual(['fornecedor'])
    // Documento normalizado para só dígitos antes de ir ao banco.
    expect(f.query.mock.calls[0][1]?.[0]).toBe('12345678909')
  })

  it('sem documento, cai para o nome normalizado', async () => {
    const f = fakeDb()
    f.query.mockResolvedValueOnce(achou())
    const m = await findPartyMatch(f.db, { name: '  Márcio Kuhar ', role: 'cliente' })
    expect(m?.matchedBy).toBe('name')
    expect(f.query.mock.calls[0][0]).toContain('LOWER(TRIM(p.name))')
    expect(f.query.mock.calls[0][1]?.[0]).toBe('márcio kuhar')
  })

  it('documento sem acerto ainda tenta pelo nome', async () => {
    const f = fakeDb()
    f.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce(achou())
    const m = await findPartyMatch(f.db, { document: '12345678909', name: 'Márcio', role: 'cliente' })
    expect(m?.matchedBy).toBe('name')
    expect(f.query).toHaveBeenCalledTimes(2)
  })

  it('exclui quem já tem o papel — isso é duplicata do mesmo papel, não outra faceta', async () => {
    const f = fakeDb()
    f.query.mockResolvedValueOnce({ rows: [] })
    const m = await findPartyMatch(f.db, { name: 'Márcio', role: 'cliente' })
    expect(m).toBeNull()
    const [sql, params] = f.query.mock.calls[0]
    expect(sql).toContain('NOT EXISTS')
    expect(params?.[2]).toBe('cliente')
  })

  it('ignora a própria identidade no caminho de edição', async () => {
    const f = fakeDb()
    f.query.mockResolvedValueOnce({ rows: [] })
    await findPartyMatch(f.db, { name: 'X', role: 'cliente', excludePartyId: 'party-1' })
    expect(f.query.mock.calls[0][1]?.[1]).toBe('party-1')
  })

  it('sem documento nem nome não consulta o banco', async () => {
    const f = fakeDb()
    expect(await findPartyMatch(f.db, { role: 'cliente' })).toBeNull()
    expect(f.query).not.toHaveBeenCalled()
  })
})

describe('mergeParties', () => {
  async function fundir() {
    const f = fakeDb()
    await mergeParties(f.db, 'party-dup', 'party-orig')
    return { ...f, sqls: f.query.mock.calls.map((c) => c[0] as string) }
  }

  it('move os papéis do duplicado sem violar a PK composta', async () => {
    const { sqls } = await fundir()
    const papeis = sqls.find((q) => /INSERT INTO cadastro\.party_roles/.test(q))
    expect(papeis).toContain('ON CONFLICT (party_id, role) DO NOTHING')
  })

  it('solta o documento do duplicado ANTES de copiá-lo', async () => {
    // idx_parties_document é UNIQUE parcial e o Postgres o checa por comando,
    // não no fim da transação: com o documento nas duas linhas ao mesmo tempo,
    // o merge morria em "duplicar valor da chave viola a restrição de
    // unicidade". Achado rodando contra o banco de verdade — os mocks não pegam.
    const f = fakeDb()
    f.query.mockResolvedValue({ rows: [{ document: '11144477735' }] })
    await mergeParties(f.db, 'party-dup', 'party-orig')
    const sqls = f.query.mock.calls.map((c) => String(c[0]))

    const iSolta = sqls.findIndex((q) => /SET document = NULL/.test(q))
    const iCompleta = sqls.findIndex((q) => /COALESCE\(o\.document/.test(q))
    expect(iSolta).toBeGreaterThan(-1)
    expect(iCompleta).toBeGreaterThan(iSolta)
    expect(f.query.mock.calls[iSolta][1]).toEqual(['party-dup'])
  })

  it('completa lacunas sem sobrescrever o que o original já tinha', async () => {
    const f = fakeDb()
    f.query.mockResolvedValue({ rows: [{ document: null }] })
    await mergeParties(f.db, 'party-dup', 'party-orig')
    const completa = f.query.mock.calls.find((c) => /COALESCE\(o\.document/.test(String(c[0])))
    expect(String(completa?.[0])).toContain('COALESCE(o.legal_name, d.legal_name)')
    // Sem documento no duplicado, nem chega a emitir o UPDATE que o solta.
    expect(f.query.mock.calls.some((c) => /SET document = NULL/.test(String(c[0])))).toBe(false)
  })

  it('só move o endereço primário se o original não tiver — o índice é único parcial', async () => {
    const { sqls } = await fundir()
    const endereco = sqls.find((q) => /UPDATE cadastro\.addresses/.test(q))
    expect(endereco).toContain('NOT EXISTS')
  })

  it('repointa customers e suppliers ANTES do DELETE (a FK não tem CASCADE)', async () => {
    const { sqls } = await fundir()
    const iCustomers = sqls.findIndex((q) => /UPDATE customers SET party_id/.test(q))
    const iSuppliers = sqls.findIndex((q) => /UPDATE suppliers SET party_id/.test(q))
    const iDelete = sqls.findIndex((q) => /DELETE FROM cadastro\.parties/.test(q))
    expect(iCustomers).toBeGreaterThan(-1)
    expect(iSuppliers).toBeGreaterThan(-1)
    expect(iDelete).toBeGreaterThan(iCustomers)
    expect(iDelete).toBeGreaterThan(iSuppliers)
  })

  it('não faz nada quando os dois lados são a mesma identidade', async () => {
    const f = fakeDb()
    await mergeParties(f.db, 'party-1', 'party-1')
    expect(f.query).not.toHaveBeenCalled()
  })
})

describe('fillOnly', () => {
  it('desliga o apagar ao ligar a uma identidade que já existia', () => {
    // A tela de cliente nunca mostrou o whatsapp que o fornecedor tinha; um
    // campo em branco aqui é "não preenchi", e não "apague o do outro papel".
    const r = fillOnly({ id: 'party-f', name: 'Márcio', email: '', whatsapp: null, city: 'Ibirama' })
    expect(r).toEqual({ id: 'party-f', name: 'Márcio', city: 'Ibirama' })
    expect('email' in r).toBe(false)
    expect('whatsapp' in r).toBe(false)
  })
})

describe('listParties', () => {
  const linha = {
    id: 'p1',
    name: 'Márcio Kuhar',
    document: '12345678909',
    kind: 'pf',
    phone: null,
    whatsapp: '47999998888',
    roles: ['cliente', 'fornecedor'],
    customer_id: 'c1',
    supplier_id: 's1',
  }

  function dbCom(rows: Record<string, unknown>[]) {
    const query = vi.fn().mockResolvedValue({ rows })
    return { db: { query } as unknown as Queryable, query }
  }

  it('sem papel legível não vai ao banco e devolve vazio', async () => {
    // Falha fechada: um chamador que esqueceu de resolver as permissões recebe
    // lista vazia, nunca "todo mundo".
    const { db, query } = dbCom([linha])
    await expect(listParties(db, { roles: [] })).resolves.toEqual([])
    expect(query).not.toHaveBeenCalled()
  })

  it('filtra pelos papéis pedidos e só pessoas ativas', async () => {
    const { db, query } = dbCom([])
    await listParties(db, { roles: ['cliente'] })
    const [sql, params] = query.mock.calls[0]
    expect(sql).toMatch(/r\.role = ANY\(\$1::text\[\]\)/)
    expect(sql).toMatch(/WHERE p\.active/)
    expect(params[0]).toEqual(['cliente'])
  })

  it('a busca cobre nome, razão, fantasia e os dígitos do documento', async () => {
    const { db, query } = dbCom([])
    await listParties(db, { roles: ['cliente'], search: '123.456.789-09' })
    const [sql, params] = query.mock.calls[0]
    expect(sql).toMatch(/p\.name\s+ILIKE/)
    expect(sql).toMatch(/p\.legal_name ILIKE/)
    expect(sql).toMatch(/p\.trade_name ILIKE/)
    expect(params[1]).toBe('123.456.789-09')
    expect(params[2]).toBe('12345678909')
  })

  it('busca sem dígito nenhum não tenta casar documento', async () => {
    const { db, query } = dbCom([])
    await listParties(db, { roles: ['cliente'], search: 'ipê' })
    expect(query.mock.calls[0][1][2]).toBeNull()
  })

  it('a pessoa com dois papéis vem numa linha só, com os dois', async () => {
    const { db } = dbCom([linha])
    const [pessoa] = await listParties(db, { roles: ['cliente', 'fornecedor'] })
    expect(pessoa.roles).toEqual(['cliente', 'fornecedor'])
    expect(pessoa.customer_id).toBe('c1')
    expect(pessoa.supplier_id).toBe('s1')
  })

  it('normaliza ausências para null em vez de undefined', async () => {
    const { db } = dbCom([{ id: 'p2', name: 'Prefeitura', roles: ['cliente'] }])
    const [pessoa] = await listParties(db, { roles: ['cliente'] })
    expect(pessoa.document).toBeNull()
    expect(pessoa.kind).toBeNull()
    expect(pessoa.supplier_id).toBeNull()
  })

  it('tem teto de linhas, com padrão', async () => {
    const { db, query } = dbCom([])
    await listParties(db, { roles: ['cliente'] })
    expect(query.mock.calls[0][1][3]).toBe(200)
    await listParties(db, { roles: ['cliente'], limit: 10 })
    expect(query.mock.calls[1][1][3]).toBe(10)
  })
})
