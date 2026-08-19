// A navegacao ja divergiu do sistema uma vez: o painel agrupava em "Pedidos /
// Operacoes de Campo / Administracao", os documentos descreviam quatro modulos
// e a matriz de permissoes usava um terceiro recorte. Estes testes existem para
// que a divergencia volte como teste vermelho, e nao como tela que devolve o
// usuario para a raiz.
import { describe, it, expect } from 'vitest'
import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  MODULES,
  ADMIN_LINKS,
  PESSOA_ROLES,
  canLink,
  linkPermissions,
  type ModuleLink,
} from '../modules'
import { ALL_PERMISSIONS, ROLES, can, type Role } from '../permissions'

/** `can` aceita qualquer objeto com `role`; o painel passa a sessao inteira. */
type Actor = Parameters<typeof can>[0]

const APP = join(process.cwd(), 'src', 'app')
const ALL_LINKS: ModuleLink[] = [...MODULES.flatMap((m) => m.links), ...ADMIN_LINKS]

/** Existe `src/app/<rota>/page.tsx` para este href? */
function routeExists(href: string): boolean {
  const segments = href.replace(/^\//, '').split('/')
  return existsSync(join(APP, ...segments, 'page.tsx'))
}

describe('catalogo de modulos', () => {
  it('declara exatamente os quatro modulos do mapa', () => {
    expect(MODULES.map((m) => m.slug)).toEqual([
      'cadastros',
      'producao',
      'comercial',
      'financeiro',
    ])
  })

  it('tem uma pagina de modulo para cada slug', () => {
    for (const { slug } of MODULES) {
      expect(routeExists(`/${slug}`), `falta src/app/${slug}/page.tsx`).toBe(true)
    }
  })

  it.each(ALL_LINKS)('$href aponta para uma rota que existe', ({ href }) => {
    expect(routeExists(href), `${href} nao tem page.tsx em src/app`).toBe(true)
  })

  it.each(ALL_LINKS)('$href usa permissoes declaradas na matriz', (link) => {
    for (const p of linkPermissions(link)) expect(ALL_PERMISSIONS).toContain(p)
  })

  it('nao repete href entre modulos', () => {
    const hrefs = ALL_LINKS.map((l) => l.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('so declara aba para rota dentro do proprio modulo, ou fora dele sem aba', () => {
    // Aba vira barra de navegacao do modulo; uma aba que sai do modulo levaria
    // o usuario para uma tela com outro cabecalho e sem volta obvia.
    for (const m of MODULES) {
      for (const l of m.links) {
        if (l.tab) {
          // Toda aba mora dentro do proprio modulo. Clientes e fornecedores
          // deixaram de ser abas justamente por nao morarem: viraram papeis
          // dentro de /cadastros/pessoas.
          expect(l.href.startsWith(`/${m.slug}/`), `${l.href} nao e de /${m.slug}`).toBe(true)
        }
      }
    }
  })
})

describe('quem ve o que no painel', () => {
  // Espelha a regra do D4 §4: a permissao do atalho e a mesma que guarda o
  // destino. O painel so mostra o modulo se houver ao menos um link acessivel.
  const modulosDe = (role: Role) =>
    MODULES.filter((m) => m.links.some((l) => canLink({ role } as Actor, l))).map(
      (m) => m.slug,
    )

  it('chefia ve os quatro modulos', () => {
    expect(modulosDe('chefia')).toEqual(['cadastros', 'producao', 'comercial', 'financeiro'])
  })

  it('gerencia e colaborador nao veem o Financeiro (D4 §3.2)', () => {
    expect(modulosDe('gerencia')).not.toContain('financeiro')
    expect(modulosDe('colaborador')).not.toContain('financeiro')
  })

  it('colaborador chega a Producao — e o modulo em que ele registra', () => {
    expect(modulosDe('colaborador')).toContain('producao')
  })

  it('nenhum papel fica sem modulo nenhum', () => {
    for (const role of ROLES) {
      expect(modulosDe(role), `${role} nao ve modulo algum`).not.toHaveLength(0)
    }
  })
})

describe('nenhuma rota de modulo ficou orfa do catalogo', () => {
  it.each(MODULES.map((m) => m.slug))('/%s nao tem tela fora do catalogo', (slug) => {
    const dir = join(APP, slug)
    if (!existsSync(dir)) return
    const subrotas = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => `/${slug}/${d.name}`)
      .filter(routeExists)
    const catalogadas = MODULES.flatMap((m) => m.links).map((l) => l.href)
    for (const r of subrotas) {
      expect(catalogadas, `${r} existe mas nao esta em src/lib/modules.ts`).toContain(r)
    }
  })
})

describe('pessoas — papeis de uma identidade', () => {
  const APP = join(process.cwd(), 'src', 'app')

  it('declara cliente, fornecedor e funcionario, nessa ordem', () => {
    expect(PESSOA_ROLES.map((p) => p.role)).toEqual(['cliente', 'fornecedor', 'funcionario'])
  })

  it.each(PESSOA_ROLES)('$role usa permissoes declaradas na matriz', (p) => {
    expect(ALL_PERMISSIONS).toContain(p.readPermission)
    if (p.createPermission) expect(ALL_PERMISSIONS).toContain(p.createPermission)
  })

  it.each(PESSOA_ROLES.filter((p) => p.href))('$role aponta para tela que existe', (p) => {
    const segments = (p.href as string).replace(/^\//, '').split('/')
    expect(existsSync(join(APP, ...segments, 'page.tsx'))).toBe(true)
  })

  it('funcionario ainda nao tem tela, e por isso nao tem botao de criar', () => {
    // Decisao registrada: o papel entra como filtro (P13 T13.3/T13.7 fazem o
    // resto). Se alguem criar a tela, este teste avisa que falta ligar o href.
    const func = PESSOA_ROLES.find((p) => p.role === 'funcionario')!
    expect(func.href).toBeNull()
    expect(func.createPermission).toBeNull()
    expect(existsSync(join(APP, 'cadastros', 'funcionarios', 'page.tsx'))).toBe(false)
  })

  it('a lista de pessoas e a porta unica: nao ha aba de cliente nem de fornecedor', () => {
    const hrefs = MODULES.flatMap((m) => m.links).map((l) => l.href)
    expect(hrefs).toContain('/cadastros/pessoas')
    expect(hrefs).not.toContain('/clientes')
  })

  it('gerencia ve Pessoas, mas nao o papel fornecedor (D4 §2)', () => {
    const gerencia = { role: 'gerencia' } as Actor
    const pessoas = MODULES.flatMap((m) => m.links).find((l) => l.href === '/cadastros/pessoas')!
    expect(canLink(gerencia, pessoas)).toBe(true)
    const legiveis = PESSOA_ROLES.filter((p) => can(gerencia, p.readPermission)).map((p) => p.role)
    expect(legiveis).not.toContain('fornecedor')
    expect(legiveis).toContain('cliente')
  })
})
