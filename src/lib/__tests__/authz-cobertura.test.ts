import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// ============================================================================
// COBERTURA ESTATICA DE AUTORIZACAO
//
// Toda Server Action exportada e um endpoint HTTP: o cliente pode chama-la
// diretamente, com os argumentos que quiser. O D4 §4 e explicito — "o terceiro
// nivel [execucao da operacao] e o que de fato protege"; rota e interface sao
// conveniencia.
//
// Este teste percorre o codigo-fonte e falha se alguma action exportada nao
// invocar um guard. Sozinho, teria pego o `registrarUso`, que ficou desde o P1
// apenas com `requireAuth()` — sem checagem de papel — contrariando a linha
// "Consumo de insumo" do D4.
// ============================================================================

const RAIZ = join(process.cwd(), 'src', 'app')

const GUARDS = [
  'authorize(',
  'requirePermission(',
  'requireAnyPermission(',
  'can(',
  'canAny(',
  'requireAuth(',
]

/**
 * Actions que legitimamente nao tem guard, cada uma com o motivo. Acrescentar
 * algo aqui e uma decisao consciente e revisavel — que e o ponto.
 */
const SEM_GUARD_JUSTIFICADO: Record<string, string> = {
  'login/actions.ts::loginAction': 'e o proprio ato de autenticar',
  'logout/actions.ts::logoutAction': 'encerrar a sessao nao exige sessao valida',
  'trocar-senha/actions.ts::changeOwnPassword':
    'usa getSession direto para nao entrar em loop de redirect com must_change_password',
  'api/fotos/[id]/route.ts::GET':
    'foto de muda nao e dado sensivel e e consumida por <Image> em Server Component; exigir sessao obrigaria a proxiar a imagem',
}

function arquivosDeAction(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) {
      if (nome === '__tests__') continue
      arquivosDeAction(caminho, acc)
    } else if (nome === 'actions.ts' || nome === 'route.ts') {
      acc.push(caminho)
    }
  }
  return acc
}

/** Corpo de cada funcao exportada: do cabecalho ate o proximo `export` de topo. */
function funcoesExportadas(src: string): { nome: string; corpo: string }[] {
  const re = /^export async function (\w+)/gm
  const achados: { nome: string; inicio: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) achados.push({ nome: m[1], inicio: m.index })

  return achados.map((f, i) => ({
    nome: f.nome,
    corpo: src.slice(f.inicio, achados[i + 1]?.inicio ?? src.length),
  }))
}

const arquivos = arquivosDeAction(RAIZ)

describe('cobertura estática de autorização', () => {
  it('encontra os arquivos de action e route', () => {
    // Se a varredura parar de achar arquivos (refactor de pastas), o teste
    // passaria vazio e daria falsa sensacao de seguranca.
    expect(arquivos.length).toBeGreaterThan(10)
  })

  it('nenhuma Server Action exportada fica sem guard', () => {
    const semGuard: string[] = []

    for (const caminho of arquivos) {
      const src = readFileSync(caminho, 'utf-8')
      const rel = caminho.slice(RAIZ.length + 1).replace(/\\/g, '/')

      for (const { nome, corpo } of funcoesExportadas(src)) {
        // Handlers HTTP entram com o nome do metodo (GET/POST/...).
        const chave = `${rel}::${nome}`
        if (chave in SEM_GUARD_JUSTIFICADO) continue
        if (!GUARDS.some((g) => corpo.includes(g))) semGuard.push(chave)
      }
    }

    expect(semGuard).toEqual([])
  })

  it('a lista de exceções não tem entrada morta', () => {
    // Exceção que sobra depois de o código mudar vira permissão esquecida.
    const existentes = new Set<string>()
    for (const caminho of arquivos) {
      const rel = caminho.slice(RAIZ.length + 1).replace(/\\/g, '/')
      for (const { nome } of funcoesExportadas(readFileSync(caminho, 'utf-8'))) {
        existentes.add(`${rel}::${nome}`)
      }
    }
    const mortas = Object.keys(SEM_GUARD_JUSTIFICADO).filter((k) => !existentes.has(k))
    expect(mortas).toEqual([])
  })

  it('nenhum papel continua escrito à mão fora de permissions.ts', () => {
    // O objetivo do refactor: nome de papel literal so existe na matriz.
    const comPapelLiteral: string[] = []
    for (const caminho of arquivos) {
      const src = readFileSync(caminho, 'utf-8')
      const rel = caminho.slice(RAIZ.length + 1).replace(/\\/g, '/')
      if (/role !== '(admin|chefia|gerencia|colaborador)'/.test(src)) {
        comPapelLiteral.push(rel)
      }
    }
    expect(comPapelLiteral).toEqual([])
  })
})
