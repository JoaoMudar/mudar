// Matriz de controle de acesso — transcricao de
// `docs/engenharia/D-arquitetura/D4-matriz-rbac.md`.
//
// Por que este arquivo existe: a autorizacao estava escrita a mao em 105
// lugares, com o nome do papel literal em cada um. O D4 era um documento que
// ninguem podia verificar contra o codigo, e as duas coisas ja tinham
// divergido em oito pontos. Aqui a matriz vira dado, um lugar so, comparado ao
// documento por teste (src/lib/__tests__/permissions.test.ts).
//
// Modulo PURO de proposito: sem `@/lib/db`, sem `next/*`. Assim pode ser
// importado por Client Component (para decidir o que renderizar) e testado
// isoladamente. Os guards que dependem de sessao ficam em `@/lib/authz.ts`.
import type { User } from '@/lib/auth'

export type Role = User['role']
export const ROLES = ['admin', 'chefia', 'gerencia', 'colaborador'] as const

/**
 * Verbos da legenda do D4 §2: C criar · L ler · A atualizar · E excluir.
 * Mantidos literais para que a matriz abaixo possa ser conferida celula a
 * celula contra a tabela do documento.
 */
export type Verb = 'criar' | 'ler' | 'atualizar' | 'excluir'

type ResourceEntry = { d4: string } & Partial<Record<Verb, readonly Role[]>>

/**
 * Uma entrada por linha da tabela do D4 §2, agrupada pelos quatro modulos do
 * sistema (`src/lib/modules.ts`) e nao mais pela ordem do documento: era por
 * ali que a matriz divergia do mapa — `custo_fixo` e `coleta_semente` ficavam
 * sob Producao enquanto as telas viviam em /admin e o mapa os punha em
 * Cadastros. O campo `d4` cita a linha de origem — e ele, nao a ordem, que
 * permite conferir sem abrir os dois arquivos lado a lado.
 *
 * Verbo ausente = ninguem pode. E mais forte que lista vazia: `can(u,
 * 'custo_unitario:criar')` nao compila, em vez de compilar e retornar false.
 */
const MATRIX = {
  // --- 1 · Cadastros — D4 §3.8: criacao e da chefia, gerencia e colaborador leem ---
  especie: {
    d4: 'Espécies',
    criar: ['chefia', 'admin'],
    ler: ['chefia', 'gerencia', 'colaborador', 'admin'],
    atualizar: ['chefia', 'admin'],
    excluir: ['chefia', 'admin'],
  },
  recipiente: {
    d4: 'Recipientes',
    criar: ['chefia', 'admin'],
    ler: ['chefia', 'gerencia', 'colaborador', 'admin'],
    atualizar: ['chefia', 'admin'],
    excluir: ['chefia', 'admin'],
  },
  insumo: {
    d4: 'Insumos',
    criar: ['chefia', 'admin'],
    ler: ['chefia', 'gerencia', 'colaborador', 'admin'],
    atualizar: ['chefia', 'admin'],
    excluir: ['chefia', 'admin'],
  },
  cliente: {
    d4: 'Clientes',
    criar: ['chefia', 'admin'],
    ler: ['chefia', 'gerencia', 'admin'],
    atualizar: ['chefia', 'admin'],
    excluir: ['chefia', 'admin'],
  },
  cliente_fiscal: {
    d4: 'Dados fiscais de cliente',
    criar: ['chefia', 'admin'],
    ler: ['chefia', 'gerencia', 'admin'],
    atualizar: ['chefia', 'admin'],
  },
  fornecedor: {
    d4: 'Fornecedores',
    criar: ['chefia', 'admin'],
    ler: ['chefia', 'admin'],
    atualizar: ['chefia', 'admin'],
    excluir: ['chefia', 'admin'],
  },
  funcionario: {
    // Vinculo empregaticio, nao nivel de acesso: `users.role` continua sendo o
    // acesso. Papel ja existe no CHECK de `cadastro.party_roles`; o que falta e
    // `users.party_id` (P13 T13.3) e a tela (P13 T13.7). Declarado desde ja
    // porque a lista de pessoas precisa saber quem pode ver funcionario, e sem
    // isto o filtro cairia numa permissao emprestada. Papeis conforme
    // docs/rotinas/1-cadastros/00-visao-geral.md (cadastrar/editar e da chefia); a
    // gerencia le porque e ela quem monta a agenda.
    d4: 'Funcionários',
    criar: ['chefia', 'admin'],
    ler: ['chefia', 'gerencia', 'admin'],
    atualizar: ['chefia', 'admin'],
    excluir: ['chefia', 'admin'],
  },
  tarefa: {
    // A agenda de pessoal (P13) traz a primeira regra que depende do REGISTRO
    // e nao so do papel: o colaborador enxerga apenas as tarefas atribuidas a
    // ele. Declarado desde ja, sem tabela nem tela, para que o mecanismo de
    // subject nasca exercitado por teste. Regra em D4 §3.11.
    d4: 'Tarefas',
    criar: ['chefia', 'gerencia'],
    ler: ['chefia', 'gerencia', 'colaborador', 'admin'],
    atualizar: ['gerencia', 'colaborador'],
    excluir: ['gerencia'],
  },

  // --- 2 · Producao — registro de atividade de campo ---
  consumo_insumo: {
    d4: 'Consumo de insumo',
    // `chefia` no criar e a emenda de 11/08/2026 ao D4 §2, registrada em §3.9:
    // o D4 da C so ao colaborador, mas o proprio §3.9 declara que o uso em
    // campo e iteracao posterior e que hoje os usuarios sao chefia e gerencia.
    // Transcrever ao pe da letra deixaria /insumos/registrar inutilizavel para
    // todo mundo que usa o sistema.
    criar: ['chefia', 'colaborador'],
    ler: ['chefia', 'gerencia', 'colaborador', 'admin'],
  },
  coleta_semente: {
    d4: 'Coleta de sementes',
    criar: ['chefia', 'admin'],
    ler: ['chefia', 'gerencia', 'admin'],
    atualizar: ['chefia', 'admin'],
    excluir: ['chefia', 'admin'],
  },
  atividade_producao: {
    d4: 'Atividades de produção',
    criar: ['chefia', 'gerencia', 'colaborador'], // 'chefia': emenda §3.9
    ler: ['chefia', 'gerencia', 'colaborador', 'admin'],
    atualizar: ['gerencia'],
  },
  estoque: {
    d4: 'Estoque',
    criar: ['gerencia'],
    ler: ['chefia', 'gerencia', 'colaborador', 'admin'],
    atualizar: ['gerencia'],
  },
  perda: {
    d4: 'Perdas',
    criar: ['chefia', 'colaborador'], // 'chefia': emenda §3.9
    ler: ['chefia', 'gerencia', 'colaborador', 'admin'],
    atualizar: ['gerencia'],
  },
  analise_perda: {
    d4: 'Análise de perdas',
    ler: ['chefia', 'gerencia', 'admin'],
  },

  // --- 3 · Comercial — pedidos, cotacao e entregas ---
  pedido: {
    d4: 'Pedidos',
    criar: ['chefia', 'admin'],
    ler: ['chefia', 'gerencia', 'colaborador', 'admin'],
    // D4 §3.3: a gerencia edita quantidades, so nao aprova.
    atualizar: ['chefia', 'gerencia', 'admin'],
    excluir: ['chefia', 'admin'],
  },
  pedido_aprovacao: {
    d4: 'Aprovação de pedido',
    // D4 §3.3: a aprovacao fixa o preco, e preco e de quem responde pela margem.
    atualizar: ['chefia', 'admin'],
  },
  verificacao: {
    d4: 'Verificação de disponibilidade',
    // D4 §3.6: privativo da gerencia — nem a chefia executa. A chefia le.
    criar: ['gerencia'],
    ler: ['chefia', 'gerencia', 'admin'],
    atualizar: ['gerencia'],
  },
  carga: {
    d4: 'Cargas',
    criar: ['gerencia'],
    ler: ['chefia', 'gerencia', 'colaborador', 'admin'],
    atualizar: ['gerencia'],
  },
  separacao_carga: {
    d4: 'Separação de carga',
    // D4 §3.5: o colaborador MARCA itens como separados, sem criar nem remover carga.
    ler: ['chefia', 'gerencia', 'admin'],
    atualizar: ['gerencia', 'colaborador'],
  },
  entrega: {
    d4: 'Entregas',
    criar: ['chefia', 'admin'],
    ler: ['chefia', 'gerencia', 'admin'],
    atualizar: ['chefia', 'admin'],
  },
  cotacao: {
    d4: 'Cotações',
    criar: ['chefia', 'admin'],
    ler: ['chefia', 'admin'],
    atualizar: ['chefia', 'admin'],
  },
  cotacao_escolha: {
    d4: 'Escolha de proposta',
    atualizar: ['chefia', 'admin'],
  },

  // --- 4 · Financeiro — modulo restrito, mas a restricao e do RECURSO (D4 §3.2).
  // Fica so com chefia/admin o que EXPOE A BASE BANCARIA: `financeiro` (extrato,
  // lancamento, compra, fechamento) e `custo_fixo`. O que DERIVA dela sem a expor
  // — custo unitario, margem, preco, indicador — a gerencia le, e sempre leu: ela
  // precisa desses numeros para verificar pedido e cotar com fornecedor.
  // Colaborador nao ve nem um nem outro (D4 §3.1). ---
  custo_fixo: {
    d4: 'Custos fixos',
    criar: ['chefia', 'admin'],
    ler: ['chefia', 'admin'],
    atualizar: ['chefia', 'admin'],
    excluir: ['chefia', 'admin'],
  },
  custo_unitario: {
    d4: 'Custo unitário',
    // D4 §3.1: o colaborador registra o consumo que COMPOE o custo e nao ve o
    // custo resultante.
    ler: ['chefia', 'gerencia', 'admin'],
  },
  margem_canal: {
    d4: 'Margem por canal',
    criar: ['chefia'],
    ler: ['chefia', 'gerencia', 'admin'],
    atualizar: ['chefia'],
  },
  preco_venda: {
    d4: 'Preço de venda',
    criar: ['chefia'],
    ler: ['chefia', 'gerencia', 'admin'],
    atualizar: ['chefia'],
  },
  financeiro: {
    d4: 'Financeiro — todos os recursos',
    criar: ['chefia', 'admin'],
    ler: ['chefia', 'admin'],
    atualizar: ['chefia', 'admin'],
    excluir: ['chefia', 'admin'],
  },
  indicador: {
    d4: 'Indicadores',
    ler: ['chefia', 'gerencia', 'admin'],
  },

  // --- Acesso — transversal aos quatro modulos, nao e modulo de negocio ---
  usuario: {
    d4: 'Usuários e perfis',
    // D4 §3.7: nenhum perfil de negocio cria usuario ou altera perfil,
    // inclusive a chefia.
    criar: ['admin'],
    ler: ['admin'],
    atualizar: ['admin'],
    excluir: ['admin'],
  },
  sessao_propria: {
    d4: 'Sessões próprias',
    // Todos os papeis, mas escopado ao proprio registro — o recorte por
    // `user_id` vive no WHERE da query, em src/app/conta/sessoes/actions.ts.
    ler: ['chefia', 'gerencia', 'colaborador', 'admin'],
    excluir: ['chefia', 'gerencia', 'colaborador', 'admin'],
  },
  auditoria_acesso: {
    d4: 'Auditoria de acesso',
    ler: ['admin'],
  },
  notificacao_propria: {
    // Nao consta do D4 — /api/notifications e anterior a matriz. Como tudo ja
    // e escopado por `user_id` em src/lib/notifications.ts, entra como recurso
    // proprio de todos os papeis, no mesmo molde de `sessao_propria`.
    d4: '(ausente do D4 — ver pendencia no topo do arquivo de teste)',
    ler: ['chefia', 'gerencia', 'colaborador', 'admin'],
    atualizar: ['chefia', 'gerencia', 'colaborador', 'admin'],
  },
} as const satisfies Record<string, ResourceEntry>

export type Resource = keyof typeof MATRIX

/**
 * Todas as permissoes validas, no formato `recurso:verbo`. Derivado da matriz:
 * um verbo que a matriz nao declara nao existe no tipo, entao errar o nome nao
 * compila em vez de virar `false` em silencio.
 */
export type Permission = {
  [R in Resource]: `${R & string}:${Extract<keyof (typeof MATRIX)[R], Verb> & string}`
}[Resource]

/**
 * Permissoes cuja decisao depende do REGISTRO, e nao apenas do papel.
 * Estar aqui torna o `subject` obrigatorio na chamada; nao estar, torna-o
 * proibido. Primeira entrada: a agenda do P13.
 */
export interface PermissionSubject {
  'tarefa:ler': { assigned_to: string | null }
  'tarefa:atualizar': { assigned_to: string | null }
}

type SubjectArgs<P extends Permission> = P extends keyof PermissionSubject
  ? [subject: PermissionSubject[P]]
  : []

/** Refinamentos por dado. So rodam DEPOIS de o papel passar pela matriz. */
const RULES: {
  [P in keyof PermissionSubject]: (u: Actor, s: PermissionSubject[P]) => boolean
} = {
  'tarefa:ler': (u, s) => u.role !== 'colaborador' || s.assigned_to === u.id,
  'tarefa:atualizar': (u, s) => u.role !== 'colaborador' || s.assigned_to === u.id,
}

export type Actor = Pick<User, 'id' | 'role'>

/**
 * Implementacao. Recebe o subject solto porque a assinatura publica, variadica
 * e dependente de `P`, nao pode ser chamada com `P` generico (`SubjectArgs<
 * Permission>` colapsa para `never`).
 */
function evaluate(
  user: Actor | null | undefined,
  permission: Permission,
  subject?: unknown,
): boolean {
  if (!user) return false

  // Override tecnico do administrador. O D4 §1 declara que "o administrador
  // nao e uma funcao da empresa" e a coluna Administrador da matriz e mais
  // restrita que a da chefia em algumas linhas. Na pratica ha uma pessoa so
  // com esse perfil, e ela precisa conseguir destravar qualquer coisa em
  // producao — a alternativa seria trocar o proprio perfil para resolver
  // incidente, que e pior. Registrado como nota no D4 §1.
  if (user.role === 'admin') return true

  const [resource, verb] = permission.split(':') as [Resource, Verb]
  const allowed = (MATRIX[resource] as ResourceEntry)[verb]
  if (!allowed?.includes(user.role)) return false

  const rule = RULES[permission as keyof PermissionSubject]
  return rule ? rule(user, subject as never) : true
}

/**
 * Assinatura publica. O `subject` e obrigatorio exatamente nas permissoes
 * declaradas em `PermissionSubject` e proibido em todas as outras — errar isso
 * nao compila.
 */
export function can<P extends Permission>(
  user: Actor | null | undefined,
  permission: P,
  ...args: SubjectArgs<P>
): boolean {
  return evaluate(user, permission, args[0])
}

/**
 * Verdadeiro se o usuario tiver QUALQUER uma das permissoes. Portao de
 * subarvore. Nao aceita subject: um portao grosso nao decide por registro.
 */
export function canAny(user: Actor | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => evaluate(user, p))
}

// --- Mensagens de negacao -------------------------------------------------

// Exaustivo por construcao: acrescentar recurso a matriz sem rotulo aqui e
// erro de compilacao.
const RESOURCE_LABELS: Record<Resource, string> = {
  especie: 'espécies',
  recipiente: 'recipientes',
  insumo: 'insumos',
  consumo_insumo: 'consumo de insumo',
  custo_fixo: 'custos fixos',
  coleta_semente: 'coletas de semente',
  custo_unitario: 'o custo unitário',
  atividade_producao: 'atividades de produção',
  estoque: 'o estoque',
  perda: 'perdas',
  analise_perda: 'a análise de perdas',
  margem_canal: 'margens por canal',
  preco_venda: 'preços de venda',
  cliente: 'clientes',
  cliente_fiscal: 'dados fiscais de cliente',
  funcionario: 'funcionários',
  pedido: 'pedidos',
  pedido_aprovacao: 'a aprovação do pedido',
  verificacao: 'a verificação de disponibilidade',
  carga: 'cargas',
  separacao_carga: 'a separação de carga',
  entrega: 'entregas',
  fornecedor: 'fornecedores',
  cotacao: 'cotações',
  cotacao_escolha: 'a escolha da proposta',
  financeiro: 'o financeiro',
  indicador: 'indicadores',
  usuario: 'usuários',
  sessao_propria: 'as próprias sessões',
  auditoria_acesso: 'a auditoria de acesso',
  notificacao_propria: 'as próprias notificações',
  tarefa: 'tarefas',
}

const VERB_LABELS: Record<Verb, string> = {
  criar: 'cadastrar',
  ler: 'consultar',
  atualizar: 'alterar',
  excluir: 'excluir',
}

// Onde "verbo + recurso" sairia truncado ou esquisito.
const MESSAGE_OVERRIDES: Partial<Record<Permission, string>> = {
  'pedido_aprovacao:atualizar': 'Sem permissão para aprovar pedidos.',
  'cotacao_escolha:atualizar': 'Sem permissão para escolher a proposta.',
  'verificacao:criar': 'Sem permissão para verificar pedidos.',
  'verificacao:atualizar': 'Sem permissão para alterar a verificação.',
  'separacao_carga:atualizar': 'Sem permissão para marcar itens como separados.',
  'consumo_insumo:criar': 'Sem permissão para registrar consumo de insumo.',
}

export function denialMessage(permission: Permission): string {
  const override = MESSAGE_OVERRIDES[permission]
  if (override) return override
  const [resource, verb] = permission.split(':') as [Resource, Verb]
  return `Sem permissão para ${VERB_LABELS[verb]} ${RESOURCE_LABELS[resource]}.`
}

// --- Introspeccao (usada pelos testes) ------------------------------------

/** Toda permissao declarada, para o teste tabular percorrer a matriz inteira. */
export const ALL_PERMISSIONS: Permission[] = Object.entries(MATRIX).flatMap(
  ([resource, entry]) =>
    Object.keys(entry)
      .filter((k): k is Verb => k !== 'd4')
      .map((verb) => `${resource}:${verb}` as Permission),
)

/** Papeis autorizados numa permissao, direto da matriz (sem o override de admin). */
export function rolesFor(permission: Permission): readonly Role[] {
  const [resource, verb] = permission.split(':') as [Resource, Verb]
  return (MATRIX[resource] as ResourceEntry)[verb] ?? []
}

/** Rotulo da linha correspondente no D4, para a mensagem de falha do teste. */
export function d4RowOf(resource: Resource): string {
  return MATRIX[resource].d4
}
