#!/usr/bin/env node
/**
 * Monta docs/engenharia/word/ a partir dos artefatos de docs/engenharia/.
 *
 * Por que existe: os artefatos sao a fonte unica. Manter uma segunda copia
 * editada a mao para o Word garantiria divergencia entre as duas em poucas
 * semanas. Este script regenera a pasta de entrega sempre que os artefatos
 * mudarem.
 *
 * O que faz:
 *   1. Concatena os artefatos na ordem do Capitulo 4 do TCC.
 *   2. Remove o bloco de metadados do topo de cada artefato (nao vai para o texto).
 *   3. Renderiza cada diagrama Mermaid em PNG (o Word nao renderiza Mermaid) e
 *      substitui o bloco por uma referencia de figura numerada.
 *
 * Uso: node scripts/build-docs-tcc.mjs [--skip-img]
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'docs', 'engenharia')
const OUT = join(SRC, 'word')
const IMG = join(OUT, 'img')
const SKIP_IMG = process.argv.includes('--skip-img')

/** Ordem do Capitulo 4. Cada entrada vira um arquivo em word/. */
const SECOES = [
  {
    arquivo: '4.1-visao-geral-da-solucao.md',
    titulo: '4.1 Visão geral da solução',
    fontes: ['A-fundacao/A1-documento-de-visao.md'],
  },
  {
    arquivo: '4.2-requisitos.md',
    titulo: '4.2 Requisitos do sistema',
    fontes: ['B-requisitos/B2-especificacao-requisitos.md'],
  },
  {
    arquivo: '4.3-modelagem-do-sistema.md',
    titulo: '4.3 Modelagem do sistema',
    fontes: ['C-modelagem/C1-diagrama-casos-de-uso.md', 'C-modelagem/C2-especificacao-casos-de-uso.md'],
  },
  {
    arquivo: '4.4-modelagem-de-dados.md',
    titulo: '4.4 Modelagem de dados',
    fontes: ['C-modelagem/C6-modelo-entidade-relacionamento.md'],
  },
  {
    arquivo: '4.5-arquitetura.md',
    titulo: '4.5 Arquitetura da solução',
    fontes: ['D-arquitetura/D1-arquitetura-c4.md', 'D-arquitetura/D3-diagrama-implantacao.md'],
  },
  {
    arquivo: '4.6-seguranca-e-controle-de-acesso.md',
    titulo: '4.6 Segurança e controle de acesso',
    fontes: [
      'D-arquitetura/D4-matriz-rbac.md',
      'E-qualidade/E4-modelagem-de-ameacas.md',
      'E-qualidade/E5-mapeamento-lgpd.md',
      'E-qualidade/E6-plano-backup-recuperacao.md',
    ],
  },
  {
    arquivo: '4.7-verificacao-e-validacao.md',
    titulo: '4.7 Verificação e validação',
    fontes: ['F-ux/F3-plano-avaliacao-usabilidade.md'],
  },
  {
    arquivo: '4.8-indicadores-de-desempenho.md',
    titulo: '4.8 Indicadores de desempenho',
    fontes: ['G-gestao/G2-fichas-de-indicadores.md'],
  },
  {
    arquivo: '4.9-rastreabilidade.md',
    titulo: '4.9 Rastreabilidade',
    fontes: ['B-requisitos/B5-matriz-rastreabilidade.md'],
  },
  // Fora do Capitulo 4
  {
    arquivo: 'cap2-acrescimos-referencial.md',
    titulo: 'Capítulo 2.5 — Acréscimos ao referencial teórico',
    fontes: ['E-qualidade/E5-E6-referencial-cap2.md'],
  },
  {
    arquivo: 'cap3-analise-de-riscos.md',
    titulo: 'Capítulo 3 — Análise de riscos do projeto',
    fontes: ['E-qualidade/E3-analise-de-riscos.md'],
  },
  // Apendices
  {
    arquivo: 'apendice-A-glossario.md',
    titulo: 'Apêndice A — Glossário do domínio',
    fontes: ['A-fundacao/A2-glossario-dominio.md'],
  },
  {
    arquivo: 'apendice-B-dicionario-de-dados.md',
    titulo: 'Apêndice B — Dicionário de dados',
    fontes: ['C-modelagem/C8-dicionario-de-dados.md'],
  },
  {
    arquivo: 'apendice-C-casos-de-teste.md',
    titulo: 'Apêndice C — Casos de teste de aceite',
    fontes: ['E-qualidade/E2-casos-de-teste-de-aceite.md'],
  },
]

let figura = 0

/** Remove o bloco de metadados (blockquote inicial) e o titulo H1 do artefato. */
function limpaCabecalho(md) {
  const linhas = md.split('\n')
  let i = 0
  while (i < linhas.length && !linhas[i].startsWith('# ')) i++
  i++ // pula o H1
  while (i < linhas.length && (linhas[i].trim() === '' || linhas[i].startsWith('>'))) i++
  while (i < linhas.length && linhas[i].trim() === '---') i++
  return linhas.slice(i).join('\n').trimStart()
}

/** Ultimo titulo markdown antes da posicao — vira legenda da figura. */
function legendaAnterior(md, pos) {
  const antes = md.slice(0, pos).split('\n').reverse()
  for (const l of antes) {
    const m = /^#{2,4}\s+(.+)$/.exec(l)
    if (m) return m[1].replace(/[*`]/g, '').replace(/^[\d.]+\s*/, '').trim()
  }
  return 'Diagrama'
}

function renderizaPng(codigo, nome) {
  const mmd = join(IMG, `${nome}.mmd`)
  const png = join(IMG, `${nome}.png`)
  writeFileSync(mmd, codigo)
  execFileSync('npx', ['-y', '@mermaid-js/mermaid-cli', '-i', mmd, '-o', png, '-w', '1400', '-b', 'white'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  })
  rmSync(mmd)
}

/** Substitui blocos mermaid por referencia de figura e gera o PNG. */
function trocaDiagramas(md, prefixo) {
  return md.replace(/```mermaid\n([\s\S]*?)```/g, (bloco, codigo, offset) => {
    figura += 1
    const n = figura
    const nome = `${prefixo}-fig${String(n).padStart(2, '0')}`
    const legenda = legendaAnterior(md, offset)
    if (!SKIP_IMG) {
      process.stdout.write(`  figura ${n}: ${nome} … `)
      renderizaPng(codigo, nome)
      process.stdout.write('ok\n')
    }
    return [
      `![Figura ${n} — ${legenda}](img/${nome}.png)`,
      '',
      `**Figura ${n}** — ${legenda}. Fonte: elaborado pelo autor (2026).`,
    ].join('\n')
  })
}

// ---------------------------------------------------------------- execucao

if (existsSync(OUT)) rmSync(OUT, { recursive: true })
mkdirSync(IMG, { recursive: true })

const indice = []

for (const secao of SECOES) {
  console.log(secao.arquivo)
  const prefixo = secao.arquivo.replace(/\.md$/, '')
  const partes = secao.fontes.map((f) => {
    const md = readFileSync(join(SRC, f), 'utf8')
    return trocaDiagramas(limpaCabecalho(md), prefixo)
  })
  const conteudo = [
    `# ${secao.titulo}`,
    '',
    `> Gerado a partir de ${secao.fontes.map((f) => '`' + f + '`').join(', ')}.`,
    '> **Não edite este arquivo** — edite o artefato de origem e rode `npm run docs:tcc`.',
    '',
    '---',
    '',
    partes.join('\n\n---\n\n'),
    '',
  ].join('\n')
  writeFileSync(join(OUT, secao.arquivo), conteudo)
  indice.push({ ...secao, prefixo })
}

// ------------------------------------------------------- guia de montagem

const cap4 = indice.filter((s) => s.arquivo.startsWith('4.'))
const fora = indice.filter((s) => s.arquivo.startsWith('cap'))
const apendices = indice.filter((s) => s.arquivo.startsWith('apendice'))

const guia = `# Como montar o TCC a partir desta pasta

> **Pasta gerada automaticamente.** Não edite nada aqui — edite o artefato de origem em
> \`docs/engenharia/\` e rode \`npm run docs:tcc\`. Qualquer edição feita nesta pasta é perdida
> na próxima geração.

Gerado em ${new Date().toISOString().slice(0, 10)} · ${indice.length} arquivos · ${figura} figuras.

## Ordem de colagem no Capítulo 4

${cap4.map((s, i) => `${i + 1}. \`${s.arquivo}\` → **${s.titulo}**`).join('\n')}

## Fora do Capítulo 4

${fora.map((s) => `- \`${s.arquivo}\` → ${s.titulo}`).join('\n')}

> **\`cap2-acrescimos-referencial.md\` deve ser colado antes do Capítulo 4.** Os artefatos de LGPD e
> de backup apresentam, nos resultados, conteúdo que o referencial atual não fundamenta. Sem esse
> acréscimo, o Capítulo 4 afirma o que o Capítulo 2 não sustenta.
>
> **\`cap3-analise-de-riscos.md\` não pertence ao Capítulo 4.** Análise de riscos do projeto é
> elemento de metodologia — cabe como seção nova no Capítulo 3.

## Apêndices

${apendices.map((s) => `- \`${s.arquivo}\` → ${s.titulo}`).join('\n')}

Estes quatro são longos demais para o corpo do texto. A recomendação é apresentar, no capítulo, uma
amostra de duas ou três tabelas e remeter ao apêndice para o restante.

## Figuras

Todas em \`img/\`, numeradas em sequência contínua (Figura 1 a Figura ${figura}) e já referenciadas no
texto de cada arquivo, com legenda no padrão ABNT abaixo da imagem.

Ao colar no Word:

1. Insira a imagem por **Inserir → Imagens → Este dispositivo**, apontando para o arquivo em \`img/\`.
2. Aplique **Inserir legenda** na figura, para que o Word mantenha a numeração automática e permita
   gerar a lista de figuras. A legenda já está escrita no texto — use-a como conteúdo.
3. Confira a largura: as imagens foram geradas a 1400 px e devem ser reduzidas à largura da mancha
   de texto.

> A **Lista de Figuras** do trabalho hoje traz apenas os títulos de exemplo. Com ${figura} figuras,
> ela passa a ser obrigatória — o próprio modelo indica que a lista é exigida acima de cinco figuras.

## Tabelas

As tabelas vêm em Markdown. Ao colar no Word, o formato mais confiável é:

1. Copiar a tabela do arquivo \`.md\`.
2. No Word, colar como **texto sem formatação**.
3. Selecionar o bloco e usar **Inserir → Tabela → Converter texto em tabela**, com \`|\` como
   separador.
4. Remover a linha de traços (\`|---|---|\`), que é sintaxe do Markdown e não conteúdo.

Alternativa mais rápida, se houver Pandoc instalado: converter o arquivo inteiro com
\`pandoc arquivo.md -o arquivo.docx\` e copiar do resultado.

## Conferência antes de entregar

- [ ] Numeração das figuras contínua e coerente com a Lista de Figuras
- [ ] Todas as tabelas cabem na largura da página, sem corte
- [ ] Figuras legíveis em escala de cinza, caso a impressão seja monocromática
- [ ] Acréscimos ao Capítulo 2.5 colados **antes** do Capítulo 4
- [ ] Referência da Lei nº 13.709/2018 inserida na seção REFERÊNCIAS
- [ ] Análise de riscos posicionada no Capítulo 3, não no 4
`

writeFileSync(join(OUT, '00-como-montar.md'), guia)

console.log(`\n${indice.length} arquivos, ${figura} figuras em word/img/`)
console.log('guia: docs/engenharia/word/00-como-montar.md')
