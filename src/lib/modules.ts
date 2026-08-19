// Catalogo dos modulos do sistema — a fonte unica da navegacao.
//
// O sistema tem QUATRO modulos (Cadastros, Producao, Comercial, Financeiro).
// Acesso e transversal: login, senha, aparelhos, usuarios, notificacoes.
// A taxonomia esta desenhada em `docs/rotinas/img/mapa-sistema-v2.mmd` e
// descrita em `docs/rotinas/00-mapa-de-rotinas.md`.
//
// Por que um catalogo e nao links soltos: o painel (`src/app/page.tsx`), os
// hubs de modulo e as abas liam a mesma coisa de tres lugares diferentes e
// divergiram. Aqui isso e uma lista so, coberta por teste.
//
// REGRA: a permissao de cada link e a MESMA que guarda a pagina de destino.
// Esconder atalho e renderizacao, nao controle de acesso (D4 §4) — existe para
// o usuario nao ver botao que o devolveria para a raiz.
import { canAny, type Actor, type Permission } from './permissions'
import type { PartyRole } from './parties'

export interface ModuleLink {
  href: string
  label: string
  desc: string
  icon: string
  /**
   * Permissao que guarda o destino. Lista quando a tela reune mais de um
   * recurso — Pessoas junta cliente, fornecedor e funcionario, e quem pode ler
   * qualquer um deles tem o que ver la. Avaliada com `canAny`.
   */
  permission: Permission | Permission[]
  /** Aparece nas abas do modulo, alem do hub. Rota externa ao modulo fica so no hub. */
  tab?: boolean
}

/** Normaliza `permission` para a forma de lista, que e o que `canAny` recebe. */
export function linkPermissions(link: { permission: Permission | Permission[] }): Permission[] {
  return Array.isArray(link.permission) ? link.permission : [link.permission]
}

/**
 * O usuario pode ver este atalho? Um unico lugar decide, para o painel, os hubs
 * e as abas nao divergirem — e para a semantica de lista ser `canAny` em todos.
 */
export function canLink(user: Actor | null | undefined, link: ModuleLink): boolean {
  return canAny(user, linkPermissions(link))
}

export interface Module {
  slug: string
  title: string
  icon: string
  /** Uma linha sobre o que o modulo e, exibida no hub. */
  summary: string
  links: ModuleLink[]
}

export const CADASTROS: Module = {
  slug: 'cadastros',
  title: 'Cadastros',
  icon: '🗂️',
  summary: 'O que é estável e se repete. Não consome nada, alimenta todo o resto.',
  links: [
    { href: '/cadastros/especies',    label: 'Espécies',     desc: 'Nome popular e científico, sinônimos, fotos', icon: '🌿', permission: 'especie:criar',     tab: true },
    { href: '/cadastros/recipientes', label: 'Recipientes',  desc: 'Tubete, sacos e balde — definem o tamanho da muda', icon: '🪣', permission: 'recipiente:criar', tab: true },
    { href: '/cadastros/insumos',     label: 'Insumos',      desc: 'Tipos de insumo e unidade de medida', icon: '📦', permission: 'insumo:criar',     tab: true },
    // Uma entrada so. Cliente, fornecedor e funcionario sao PAPEIS da mesma
    // pessoa (`cadastro.parties`) — com duas abas irmas, quem vende muda e
    // tambem compra aparecia duas vezes. As telas de papel continuam existindo,
    // nas URLs antigas: a rotina de pedidos e a de cotacao apontam para elas, e
    // `notifications.link` guarda caminho ja gravado no banco.
    { href: '/cadastros/pessoas',     label: 'Pessoas',      desc: 'Clientes, fornecedores e funcionários — uma identidade, N papéis', icon: '👥', permission: ['cliente:ler', 'fornecedor:ler', 'funcionario:ler'], tab: true },
  ],
}

/**
 * Os papeis que a lista de pessoas mostra, na ordem em que aparecem nos filtros.
 *
 * `href` nulo = o papel existe no cadastro mas ainda nao tem tela. E o caso de
 * funcionario: o papel ja esta no CHECK de `cadastro.party_roles` e o P13 preve
 * `users.party_id` (T13.3) e o CRUD (T13.7), mas nenhum dos dois foi feito.
 * Ate la o filtro existe e devolve lista vazia — que e honesto, e diferente de
 * um botao que leva a lugar nenhum.
 */
export interface PersonRole {
  role: PartyRole
  label: string
  icon: string
  /** Guarda a leitura do papel na lista. Poda tambem os selos de cada linha. */
  readPermission: Permission
  /** Tela do papel; `null` enquanto nao existir. */
  href: string | null
  /** Guarda o botao "novo"; `null` quando nao ha tela de cadastro. */
  createPermission: Permission | null
}

export const PESSOA_ROLES: PersonRole[] = [
  {
    role: 'cliente',
    label: 'Clientes',
    icon: '🧾',
    readPermission: 'cliente:ler',
    href: '/clientes',
    createPermission: 'cliente:criar',
  },
  {
    role: 'fornecedor',
    label: 'Fornecedores',
    icon: '🤝',
    readPermission: 'fornecedor:ler',
    href: '/fornecedores',
    createPermission: 'fornecedor:criar',
  },
  {
    role: 'funcionario',
    label: 'Funcionários',
    icon: '👷',
    readPermission: 'funcionario:ler',
    href: null,
    createPermission: null,
  },
]

export const PRODUCAO: Module = {
  slug: 'producao',
  title: 'Produção',
  icon: '🌱',
  summary: 'Registro de atividade de campo. Consome as compras lançadas no Financeiro.',
  links: [
    { href: '/producao/consumo-insumos', label: 'Consumo de Insumos', desc: 'Registrar uso de insumo no campo — funciona offline', icon: '📦', permission: 'consumo_insumo:criar', tab: true },
    { href: '/producao/coleta-sementes', label: 'Coleta de Sementes', desc: 'Origem própria da matéria-prima', icon: '🌰', permission: 'coleta_semente:criar', tab: true },
  ],
}

export const COMERCIAL: Module = {
  slug: 'comercial',
  title: 'Comercial',
  icon: '🤝',
  summary: 'Pedidos, cotação com fornecedores e entregas.',
  links: [
    { href: '/pedidos',                label: 'Pedidos',   desc: 'Cadastrar, verificar, aprovar e separar', icon: '🧾', permission: 'pedido:ler' },
    { href: '/fornecedores/cotar',     label: 'Orçamento', desc: 'Pedir preço a fornecedor pelo WhatsApp', icon: '💬', permission: 'cotacao:criar' },
    { href: '/fornecedores/cotacoes',  label: 'Cotações',  desc: 'Comparar propostas e escolher', icon: '📋', permission: 'cotacao:ler' },
    { href: '/fornecedores/mapa',      label: 'Mapa',      desc: 'Onde está cada fornecedor e a que distância', icon: '🗺️', permission: 'fornecedor:ler' },
    { href: '/fornecedores/dashboard', label: 'Painel',    desc: 'Situação das cotações e lacunas da rede', icon: '📊', permission: 'cotacao:ler' },
  ],
}

export const FINANCEIRO: Module = {
  slug: 'financeiro',
  title: 'Financeiro',
  icon: '🏦',
  summary: 'Onde a compra nasce e onde o custo real vira preço. A base bancária é só da chefia; custo e preço a gerência lê.',
  links: [
    { href: '/financeiro/custos-fixos', label: 'Custos Fixos', desc: 'Rateados sobre a produção; base do custo por muda', icon: '🧮', permission: 'custo_fixo:criar', tab: true },
  ],
}

/** Os quatro modulos, na ordem em que o fluxo do sistema os percorre. */
export const MODULES: Module[] = [CADASTROS, PRODUCAO, COMERCIAL, FINANCEIRO]

/**
 * Acesso — transversal, fora dos quatro. Fica no painel como "Minha Conta" e
 * "Administração"; nao e modulo de negocio.
 */
export const ADMIN_LINKS: ModuleLink[] = [
  { href: '/admin/usuarios', label: 'Usuários', desc: 'Contas, perfis e senha provisória', icon: '🔐', permission: 'usuario:criar', tab: true },
]
