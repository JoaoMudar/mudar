import { describe, it, expect } from 'vitest'
import {
  can,
  canAny,
  denialMessage,
  rolesFor,
  d4RowOf,
  ALL_PERMISSIONS,
  ROLES,
  type Resource,
  type Role,
} from '../permissions'

// ============================================================================
// O CONTRATO D4 <-> CODIGO
//
// A tabela abaixo e a transcricao LITERAL de docs/engenharia/D-arquitetura/
// D4-matriz-rbac.md §2, celula a celula, na ordem do documento. Nao importa
// nada de permissions.ts: e uma segunda leitura independente do artefato.
//
// Se a matriz do codigo mudar sem que o documento mude (ou vice-versa), este
// teste quebra. E a unica coisa que impede as duas de divergirem de novo em
// silencio, como ja aconteceu em oito pontos.
// ============================================================================

/** Colunas do D4 §2, nesta ordem. */
const COLUNAS: Role[] = ['chefia', 'gerencia', 'colaborador', 'admin']

/** `'C L A E'` -> verbos. `'—'` ou `''` -> nenhum. */
const VERBO_DE_LETRA = { C: 'criar', L: 'ler', A: 'atualizar', E: 'excluir' } as const

// Linha do D4 §2 -> celulas de Chefia, Gerencia, Colaborador, Administrador.
const D4: Record<string, [string, string, string, string]> = {
  'Espécies':                         ['C L A E', 'L',     'L',     'C L A E'],
  'Recipientes':                      ['C L A E', 'L',     'L',     'C L A E'],
  'Insumos':                          ['C L A E', 'L',     'L',     'C L A E'],
  'Consumo de insumo':                ['L',       'L',     'C L',   'L'      ],
  'Custos fixos':                     ['C L A E', '—',     '—',     'C L A E'],
  'Coleta de sementes':               ['C L A E', 'L',     '—',     'C L A E'],
  'Custo unitário':                   ['L',       'L',     '—',     'L'      ],
  'Atividades de produção':           ['L',       'C L A', 'C L',   'L'      ],
  'Estoque':                          ['L',       'C L A', 'L',     'L'      ],
  'Perdas':                           ['L',       'L A',   'C L',   'L'      ],
  'Análise de perdas':                ['L',       'L',     '—',     'L'      ],
  'Margem por canal':                 ['C L A',   'L',     '—',     'L'      ],
  'Preço de venda':                   ['C L A',   'L',     '—',     'L'      ],
  'Clientes':                         ['C L A E', 'L',     '—',     'C L A E'],
  'Dados fiscais de cliente':         ['C L A',   'L',     '—',     'C L A'  ],
  'Pedidos':                          ['C L A E', 'L A',   'L',     'C L A E'],
  'Aprovação de pedido':              ['A',       '—',     '—',     'A'      ],
  'Verificação de disponibilidade':   ['L',       'C L A', '—',     'L'      ],
  'Cargas':                           ['L',       'C L A', 'L',     'L'      ],
  'Separação de carga':               ['L',       'L A',   'A',     'L'      ],
  'Entregas':                         ['C L A',   'L',     '—',     'C L A'  ],
  'Fornecedores':                     ['C L A E', '—',     '—',     'C L A E'],
  'Cotações':                         ['C L A',   '—',     '—',     'C L A'  ],
  'Escolha de proposta':              ['A',       '—',     '—',     'A'      ],
  'Financeiro — todos os recursos':   ['C L A E', '—',     '—',     'C L A E'],
  'Indicadores':                      ['L',       'L',     '—',     'L'      ],
  'Usuários e perfis':                ['—',       '—',     '—',     'C L A E'],
  'Sessões próprias':                 ['L E',     'L E',   'L E',   'L E'    ],
  'Auditoria de acesso':              ['—',       '—',     '—',     'L'      ],
}

/**
 * Emendas ao D4 aprovadas em 11/08/2026, com a justificativa registrada em
 * permissions.ts e no proprio D4 §3.9. Toda diferenca entre o documento e o
 * codigo tem de estar declarada aqui — qualquer outra quebra o teste.
 *
 * O D4 §2 da `C` de consumo, atividades e perdas SO ao colaborador. Mas o §3.9
 * declara que o uso em campo e iteracao posterior e que hoje os usuarios
 * efetivos sao chefia e gerencia. Ao pe da letra, /insumos/registrar ficaria
 * inutilizavel para quem de fato usa o sistema.
 */
const EMENDAS: Record<string, { verbo: string; papel: Role; motivo: string }[]> = {
  'Consumo de insumo':      [{ verbo: 'criar', papel: 'chefia', motivo: 'D4 §3.9' }],
  'Atividades de produção': [{ verbo: 'criar', papel: 'chefia', motivo: 'D4 §3.9' }],
  'Perdas':                 [{ verbo: 'criar', papel: 'chefia', motivo: 'D4 §3.9' }],
}

/** Recursos que ainda nao tem linha no D4, cada um com a pendencia declarada. */
const FORA_DO_D4: Record<string, string> = {
  notificacao_propria: '/api/notifications e anterior a matriz; escopado por user_id',
  tarefa: 'agenda de pessoal — P13 Fase 6, T13.22 acrescenta a linha ao D4',
  funcionario:
    'vínculo empregatício (papel de `cadastro.party_roles`) — P13 T13.3/T13.7; '
    + 'entra no D4 junto com `tarefa`',
}

function papeisEsperados(linha: string, verbo: string): Role[] {
  const celulas = D4[linha]
  const papeis: Role[] = []
  celulas.forEach((celula, i) => {
    const letras = celula.split(/\s+/).filter((l) => l in VERBO_DE_LETRA)
    if (letras.some((l) => VERBO_DE_LETRA[l as keyof typeof VERBO_DE_LETRA] === verbo)) {
      papeis.push(COLUNAS[i])
    }
  })
  for (const e of EMENDAS[linha] ?? []) {
    if (e.verbo === verbo && !papeis.includes(e.papel)) papeis.push(e.papel)
  }
  return papeis
}

describe('matriz de permissões × D4', () => {
  it('todo recurso do código aponta para uma linha do D4 ou declara a pendência', () => {
    const semLinha: string[] = []
    for (const p of ALL_PERMISSIONS) {
      const recurso = p.split(':')[0] as Resource
      const linha = d4RowOf(recurso)
      if (!(linha in D4) && !(recurso in FORA_DO_D4)) semLinha.push(recurso)
    }
    expect(semLinha).toEqual([])
  })

  it('toda linha do D4 está representada no código', () => {
    const linhasNoCodigo = new Set(
      ALL_PERMISSIONS.map((p) => d4RowOf(p.split(':')[0] as Resource)),
    )
    const faltando = Object.keys(D4).filter((l) => !linhasNoCodigo.has(l))
    expect(faltando).toEqual([])
  })

  // O teste que de fato amarra as duas coisas: percorre a matriz inteira.
  it.each(
    ALL_PERMISSIONS.filter((p) => d4RowOf(p.split(':')[0] as Resource) in D4).map(
      (p) => [p, d4RowOf(p.split(':')[0] as Resource)] as const,
    ),
  )('%s confere com a linha "%s" do D4', (permissao, linha) => {
    const verbo = permissao.split(':')[1]
    expect([...rolesFor(permissao)].sort()).toEqual(papeisEsperados(linha, verbo).sort())
  })

  it('recursos fora do D4 são exatamente os declarados como pendência', () => {
    const fora = [
      ...new Set(
        ALL_PERMISSIONS.map((p) => p.split(':')[0] as Resource).filter(
          (r) => !(d4RowOf(r) in D4),
        ),
      ),
    ].sort()
    expect(fora).toEqual(Object.keys(FORA_DO_D4).sort())
  })
})

describe('can — regras estruturais', () => {
  it('nega quando não há usuário', () => {
    expect(can(null, 'pedido:ler')).toBe(false)
    expect(can(undefined, 'pedido:ler')).toBe(false)
  })

  it('admin passa em tudo (override técnico do D4 §1)', () => {
    const admin = { id: 'u1', role: 'admin' as const }
    for (const p of ALL_PERMISSIONS) {
      // Via canAny porque `can` exige subject nas permissões que o declaram —
      // e o override do admin curto-circuita antes de olhar o registro.
      expect(canAny(admin, [p])).toBe(true)
    }
  })

  it('as regras de exceção do D4 §3 valem na prática', () => {
    const chefia = { id: 'u1', role: 'chefia' as const }
    const gerencia = { id: 'u2', role: 'gerencia' as const }
    const colaborador = { id: 'u3', role: 'colaborador' as const }

    // §3.1 — colaborador não vê custo nem preço
    expect(can(colaborador, 'custo_unitario:ler')).toBe(false)
    expect(can(colaborador, 'preco_venda:ler')).toBe(false)
    expect(can(colaborador, 'margem_canal:ler')).toBe(false)

    // §3.2 — financeiro é exclusivo da chefia, nem leitura para a gerência
    expect(can(chefia, 'financeiro:ler')).toBe(true)
    expect(can(gerencia, 'financeiro:ler')).toBe(false)

    // §3.3 — aprovar pedido é privativo da chefia; a gerência edita quantidades
    expect(can(chefia, 'pedido_aprovacao:atualizar')).toBe(true)
    expect(can(gerencia, 'pedido_aprovacao:atualizar')).toBe(false)
    expect(can(gerencia, 'pedido:atualizar')).toBe(true)

    // §3.4 — a gerência não registra custo fixo
    expect(can(gerencia, 'custo_fixo:criar')).toBe(false)

    // §3.5 — o colaborador atualiza a separação, mas não cria carga
    expect(can(colaborador, 'separacao_carga:atualizar')).toBe(true)
    expect(can(colaborador, 'carga:criar')).toBe(false)

    // §3.6 — verificar é privativo da gerência; nem a chefia executa
    expect(can(gerencia, 'verificacao:criar')).toBe(true)
    expect(can(chefia, 'verificacao:criar')).toBe(false)
    expect(can(chefia, 'verificacao:ler')).toBe(true)

    // §3.7 — ninguém administra usuários, inclusive a chefia
    expect(can(chefia, 'usuario:criar')).toBe(false)

    // §3.8 — cadastros são da chefia; a gerência lê o que precisa para operar
    expect(can(gerencia, 'especie:criar')).toBe(false)
    expect(can(gerencia, 'especie:ler')).toBe(true)
    expect(can(gerencia, 'recipiente:ler')).toBe(true)
    expect(can(gerencia, 'cliente:ler')).toBe(true)
    expect(can(gerencia, 'cliente:criar')).toBe(false)
  })
})

describe('can — regra dependente de dado (P13)', () => {
  const colaborador = { id: 'user-1', role: 'colaborador' as const }
  const gerencia = { id: 'user-9', role: 'gerencia' as const }

  it('colaborador lê a própria tarefa', () => {
    expect(can(colaborador, 'tarefa:ler', { assigned_to: 'user-1' })).toBe(true)
  })

  it('colaborador não lê tarefa de outro', () => {
    expect(can(colaborador, 'tarefa:ler', { assigned_to: 'user-2' })).toBe(false)
    expect(can(colaborador, 'tarefa:atualizar', { assigned_to: 'user-2' })).toBe(false)
  })

  it('colaborador não lê tarefa sem responsável', () => {
    expect(can(colaborador, 'tarefa:ler', { assigned_to: null })).toBe(false)
  })

  it('gerência lê tarefa de qualquer um', () => {
    expect(can(gerencia, 'tarefa:ler', { assigned_to: 'user-1' })).toBe(true)
    expect(can(gerencia, 'tarefa:ler', { assigned_to: null })).toBe(true)
  })

  it('o papel é verificado antes do dado: colaborador não exclui nem a própria', () => {
    expect(can(colaborador, 'tarefa:excluir')).toBe(false)
  })
})

describe('canAny', () => {
  it('basta uma permissão', () => {
    const gerencia = { id: 'u', role: 'gerencia' as const }
    expect(canAny(gerencia, ['especie:criar', 'especie:ler'])).toBe(true)
    expect(canAny(gerencia, ['especie:criar', 'usuario:criar'])).toBe(false)
  })

  it('sem usuário, nega', () => {
    expect(canAny(null, ['especie:ler'])).toBe(false)
  })
})

describe('denialMessage', () => {
  it('produz mensagem para toda permissão da matriz', () => {
    for (const p of ALL_PERMISSIONS) {
      const msg = denialMessage(p)
      expect(msg).toMatch(/^Sem permissão para .+\.$/)
      expect(msg).not.toMatch(/undefined/)
    }
  })

  // Os testes de negação em pedidos casam com /permissão/i — o formato não
  // pode mudar sem que eles sejam revistos.
  it('mantém o formato que os testes de Server Action esperam', () => {
    expect(denialMessage('pedido_aprovacao:atualizar')).toMatch(/permissão/i)
    expect(denialMessage('pedido:criar')).toBe('Sem permissão para cadastrar pedidos.')
  })
})

describe('cobertura da matriz', () => {
  it('todos os papéis conhecidos aparecem em alguma permissão', () => {
    const usados = new Set(ALL_PERMISSIONS.flatMap((p) => [...rolesFor(p)]))
    for (const r of ROLES) expect(usados.has(r)).toBe(true)
  })

  it('nenhuma permissão referencia papel inexistente', () => {
    for (const p of ALL_PERMISSIONS) {
      for (const r of rolesFor(p)) expect(ROLES).toContain(r)
    }
  })
})
