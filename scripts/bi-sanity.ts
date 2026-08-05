/**
 * Conferencia do BI financeiro — somente leitura.
 *
 * Roda depois de importar o schema `financeiro` e de aplicar as migracoes, e
 * responde uma pergunta so: os numeros continuam os mesmos?
 *
 * Existe porque as views vw_bi_* aplicam regras que, se quebrarem, quebram em
 * silencio e o painel segue bonito com o numero errado. Os casos reais:
 *   - esquecer `eh_totalizador = FALSE` infla a despesa ~4x (R$21,5M sobre R$7M);
 *   - mexer no rateio muda o DRE inteiro sem aviso;
 *   - a receita NUNCA deveria mudar — se mudar, algo grave aconteceu.
 *
 * Uso:  npm run bi:sanity
 * Sai com codigo != 0 se qualquer verificacao exata falhar (serve em CI).
 */

import { Pool as PgPool } from 'pg'
import { Pool as NeonPool } from '@neondatabase/serverless'
import fs from 'fs'
import path from 'path'

// Mesmo carregamento de .env.local usado por scripts/migrate.ts (tsx nao carrega sozinho).
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx)
    if (!process.env[key]) process.env[key] = trimmed.slice(idx + 1)
  }
}

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:123@localhost:5432/viveiro'

const pool = DATABASE_URL.includes('neon.tech')
  ? new NeonPool({ connectionString: DATABASE_URL })
  : new PgPool({ connectionString: DATABASE_URL })

type Modo = 'exato' | 'info'

interface Check {
  nome: string
  sql: string
  /** Valor esperado. Numeros comparam com tolerancia de centavo. */
  esperado?: number | string | boolean
  modo: Modo
  nota?: string
}

/**
 * Fixtures medidos em 04/08/2026, logo apos a importacao.
 * Mudar qualquer um destes numeros tem que ser uma decisao consciente — nao um
 * efeito colateral. Se um valor mudar de proposito, atualize aqui junto.
 */
const CHECKS: Check[] = [
  // --- Integridade da importacao ---
  {
    nome: 'despesas importadas (todas)',
    sql: 'SELECT count(*)::int FROM financeiro.despesas',
    esperado: 43415,
    modo: 'exato',
  },
  {
    nome: 'notas fiscais importadas',
    sql: 'SELECT count(*)::int FROM financeiro.notas_fiscais',
    esperado: 2488,
    modo: 'exato',
  },
  {
    nome: 'itens de nota importados',
    sql: 'SELECT count(*)::int FROM financeiro.itens_nota',
    esperado: 3425,
    modo: 'exato',
  },
  {
    nome: 'controle de notas importado',
    sql: 'SELECT count(*)::int FROM financeiro.controle_notas',
    esperado: 9094,
    modo: 'exato',
  },

  // --- A regra do totalizador ---
  {
    nome: 'totalizadores existem na tabela',
    sql: 'SELECT count(*)::int FROM financeiro.despesas WHERE eh_totalizador',
    esperado: 2663,
    modo: 'exato',
    nota: 'R$21,5M que NAO podem aparecer em nenhuma vw_bi_*',
  },
  {
    nome: 'nenhum totalizador vazou para o fato base',
    sql: `SELECT count(*)::int FROM financeiro.vw_bi_despesas v
          JOIN financeiro.despesas d ON d.id = v.id WHERE d.eh_totalizador`,
    esperado: 0,
    modo: 'exato',
    nota: 'se falhar, a despesa esta inflada ~4x',
  },

  // --- Fato base (janela 2020+) ---
  {
    nome: 'linhas no fato base',
    sql: 'SELECT count(*)::int FROM financeiro.vw_bi_despesas',
    esperado: 12225,
    modo: 'exato',
  },
  {
    nome: 'valor total no fato base',
    sql: 'SELECT sum(valor)::float FROM financeiro.vw_bi_despesas',
    esperado: 3005988.41,
    modo: 'exato',
  },
  {
    nome: 'despesa de negocio (rateada)',
    sql: 'SELECT sum(valor_negocio)::float FROM financeiro.vw_bi_despesas',
    esperado: 1318274.01,
    modo: 'exato',
  },
  {
    nome: 'corte de ano respeitado (nada antes de 2020)',
    sql: `SELECT count(*)::int FROM financeiro.vw_bi_despesas
          WHERE ano_ref < financeiro.bi_ano_minimo()`,
    esperado: 0,
    modo: 'exato',
  },
  {
    nome: 'soft delete respeitado',
    sql: `SELECT count(*)::int FROM financeiro.vw_bi_despesas v
          JOIN financeiro.despesas d ON d.id = v.id WHERE d.excluido_em IS NOT NULL`,
    esperado: 0,
    modo: 'exato',
  },

  // --- O invariante do rateio ---
  {
    nome: 'INVARIANTE negocio + pessoal = total',
    sql: `SELECT ROUND(sum(valor_negocio) + sum(valor_pessoal) - sum(valor), 2)::float
          FROM financeiro.vw_bi_despesas`,
    esperado: 0,
    modo: 'exato',
    nota: 'tem que fechar ao centavo',
  },

  // --- Os vazamentos de natureza ---
  {
    nome: 'vazamento: gasto pessoal no DRE do negocio',
    sql: `SELECT COALESCE(sum(valor_negocio), 0)::float FROM financeiro.vw_bi_despesas
          WHERE categoria_natureza = 'pessoal'`,
    esperado: 0,
    modo: 'exato',
    nota: 'eram R$48.793 antes da correcao',
  },
  {
    nome: 'gasto de negocio integralmente contado',
    sql: `SELECT count(*)::int FROM financeiro.vw_bi_despesas
          WHERE categoria_natureza = 'negocio' AND pct_negocio <> 100`,
    esperado: 0,
    modo: 'exato',
    nota: 'categoria manda sobre despesas.natureza (recupera R$63.311)',
  },
  {
    nome: 'nunca chuta 0 ou 100 sem base',
    sql: `SELECT count(*)::int FROM financeiro.vw_bi_despesas
          WHERE classificacao = 'sem_classificacao' AND pct_negocio IS NOT NULL`,
    esperado: 0,
    modo: 'exato',
  },

  // --- Receita: a guarda de regressao mais importante ---
  {
    nome: 'receita 2025 (NAO pode mudar nunca)',
    sql: 'SELECT sum(receita)::float FROM financeiro.vw_bi_receita_mensal WHERE ano = 2025',
    esperado: 508809.55,
    modo: 'exato',
    nota: 'nenhuma mudanca de rateio pode mexer na receita',
  },
  {
    nome: 'despesa de negocio 2025',
    sql: 'SELECT despesa_negocio::float FROM financeiro.vw_bi_dre_anual WHERE ano = 2025',
    esperado: 263728.88,
    modo: 'exato',
    nota: 'muda se o rateio for reconfigurado — mude aqui junto, de proposito',
  },

  // --- Cobertura: os buracos conhecidos ---
  {
    nome: 'meses de despesa por lancar (2024)',
    sql: `SELECT COALESCE(sum(cardinality(meses_faltantes)), 0)::int
          FROM financeiro.vw_bi_cobertura`,
    esperado: 4,
    modo: 'exato',
    nota: 'set-dez/2024 — mai-jul/2026 entraram na sincronizacao de 05/08/2026',
  },
  {
    nome: '2024 marcado incompleto',
    sql: 'SELECT completo FROM financeiro.vw_bi_cobertura WHERE ano = 2024',
    esperado: false,
    modo: 'exato',
  },
  {
    nome: '2026 marcado incompleto',
    sql: 'SELECT completo FROM financeiro.vw_bi_cobertura WHERE ano = 2026',
    esperado: false,
    modo: 'exato',
  },
  {
    nome: 'margem anual suprimida em ano incompleto',
    sql: `SELECT count(*)::int FROM financeiro.vw_bi_dre_anual
          WHERE NOT completo AND margem_pct IS NOT NULL`,
    esperado: 0,
    modo: 'exato',
    nota: 'a margem cheia de 2024/2026 (74% e 79%) e artefato — nao pode aparecer',
  },

  // --- Pendencias de categorizacao ---
  {
    nome: 'pendencias sem categoria',
    sql: 'SELECT count(*)::int FROM financeiro.vw_bi_pendencias',
    esperado: 2764,
    modo: 'exato',
    nota: 'cai conforme a fila e trabalhada',
  },
  {
    nome: 'valor pendente',
    sql: 'SELECT sum(valor)::float FROM financeiro.vw_bi_pendencias',
    esperado: 407138.09,
    modo: 'exato',
  },
  {
    nome: 'fatia >= R$100 (o alvo da triagem)',
    sql: 'SELECT count(*)::int FROM financeiro.vw_bi_pendencias WHERE valor >= 100',
    esperado: 827,
    modo: 'exato',
    nota: '65% do valor pendente em 23% das linhas',
  },

  // --- Conferencia contra a planilha original ---
  {
    nome: 'abas-mes conferidas',
    sql: 'SELECT count(*)::int FROM financeiro.vw_bi_conferencia_mensal',
    esperado: 84,
    modo: 'exato',
  },
  {
    nome: 'abas que batem com a planilha',
    sql: 'SELECT count(*)::int FROM financeiro.vw_bi_conferencia_mensal WHERE confere',
    esperado: 47,
    modo: 'exato',
  },

  // --- Geografia ---
  {
    nome: 'receita sem coordenada',
    sql: `SELECT COALESCE(sum(receita), 0)::float FROM financeiro.vw_bi_vendas_geo
          WHERE NOT tem_coordenada`,
    esperado: 0,
    modo: 'exato',
    nota: 'cobertura 100% — se subir, o mapa passa a omitir venda',
  },

  // --- Normalizacao de texto (contrato entre JS e SQL) ---
  // `unaccent` nao esta instalado; src/lib/text.ts grava o padrao sem acento e
  // financeiro.bi_normaliza() precisa produzir exatamente a mesma forma. Se
  // divergir, as regras de categorizacao param de casar em silencio.
  {
    nome: 'bi_normaliza tira acento e minusculiza',
    sql: `SELECT financeiro.bi_normaliza('Combustível ÁÇÃO Ñ')`,
    esperado: 'combustivel acao n',
    modo: 'exato',
  },
  {
    nome: 'regra sem acento casa com descricao acentuada',
    sql: `SELECT (financeiro.bi_normaliza('Combustível Posto') LIKE '%combustivel%')`,
    esperado: true,
    modo: 'exato',
    nota: 'se falhar, a categorizacao em lote nao pega nada',
  },
  {
    nome: 'bi_normaliza aguenta NULL',
    sql: `SELECT financeiro.bi_normaliza(NULL) = ''`,
    esperado: true,
    modo: 'exato',
  },

  // --- Clientes ---
  {
    nome: 'clientes distintos na janela',
    sql: 'SELECT COUNT(DISTINCT cliente_id)::int FROM financeiro.vw_bi_clientes',
    esperado: 791,
    modo: 'exato',
  },
  {
    nome: 'receita de clientes bate com a das notas',
    sql: `SELECT ROUND(
            (SELECT COALESCE(SUM(receita), 0) FROM financeiro.vw_bi_clientes)
            - (SELECT COALESCE(SUM(nf.valor_total), 0) FROM financeiro.notas_fiscais nf
                WHERE nf.ano::int >= financeiro.bi_ano_minimo()
                  AND nf.destinatario_id IS NOT NULL), 2)::float`,
    esperado: 0,
    modo: 'exato',
    nota: 'a view de clientes nao pode perder nem inventar receita',
  },

  // --- Informativos (mudam com o uso, nao falham) ---
  {
    nome: 'lancamentos feitos pelo app',
    sql: `SELECT count(*)::int FROM financeiro.despesas
          WHERE origem_lancamento = 'app' AND excluido_em IS NULL`,
    modo: 'info',
  },
  {
    nome: 'regras de categorizacao aprendidas',
    sql: 'SELECT count(*)::int FROM financeiro.regras_categoria',
    modo: 'info',
  },
  {
    nome: 'linhas de rateio configuradas',
    sql: 'SELECT count(*)::int FROM financeiro.rateio_categoria',
    modo: 'info',
  },
]

function formata(v: unknown): string {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : v.toFixed(2)
  }
  return String(v)
}

function bate(atual: unknown, esperado: number | string | boolean): boolean {
  if (typeof esperado === 'number' && typeof atual === 'number') {
    return Math.abs(atual - esperado) < 0.011 // tolerancia de centavo
  }
  return atual === esperado
}

async function run() {
  // Sem o schema nao ha o que conferir — e provavelmente e so falta de importar.
  const { rows: ns } = await pool.query(
    `SELECT to_regnamespace('financeiro') IS NOT NULL AS existe`,
  )
  if (!ns[0]?.existe) {
    console.error('\n  Schema `financeiro` nao existe neste banco.')
    console.error('  Rode:  npm run db:import-financeiro\n')
    process.exit(1)
  }

  // As migracoes criam as views; sem elas o resto e ruido.
  const { rows: vs } = await pool.query(
    `SELECT to_regclass('financeiro.vw_bi_despesas') IS NOT NULL AS existe`,
  )
  if (!vs[0]?.existe) {
    console.error('\n  As views vw_bi_* nao existem. Rode:  npm run db:migrate')
    console.error('  (se o schema foi importado DEPOIS das migracoes, elas viraram no-op —')
    console.error("   apague com: DELETE FROM _migrations WHERE filename LIKE '2026080500%';)\n")
    process.exit(1)
  }

  console.log('\n  Conferencia do BI financeiro\n')

  let falhas = 0
  let ok = 0

  for (const c of CHECKS) {
    let atual: unknown
    try {
      const { rows } = await pool.query(c.sql)
      atual = rows[0] ? Object.values(rows[0])[0] : null
      if (typeof atual === 'string' && atual !== '' && !Number.isNaN(Number(atual))) {
        atual = Number(atual) // numeric do Postgres chega como string
      }
    } catch (e) {
      console.log(`  ERRO   ${c.nome}`)
      console.log(`         ${(e as Error).message}`)
      falhas++
      continue
    }

    if (c.modo === 'info') {
      console.log(`  ....   ${c.nome.padEnd(46)} ${formata(atual)}`)
      continue
    }

    if (bate(atual, c.esperado!)) {
      ok++
      console.log(`  OK     ${c.nome.padEnd(46)} ${formata(atual)}`)
    } else {
      falhas++
      console.log(`  FALHA  ${c.nome.padEnd(46)} ${formata(atual)}`)
      console.log(`         esperado: ${formata(c.esperado)}`)
      if (c.nota) console.log(`         ${c.nota}`)
    }
  }

  console.log(`\n  ${ok} ok, ${falhas} falha(s)\n`)
  await pool.end()
  if (falhas > 0) process.exit(1)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
