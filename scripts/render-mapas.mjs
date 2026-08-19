#!/usr/bin/env node
/**
 * Renderiza os mapas de docs/rotinas/img/: COLORIDOS na fonte, CINZA no PNG.
 *
 * Por que existe:
 *   1. O `.mmd` e a fonte de edicao, e cor comunica status muito melhor na tela:
 *      quem abre o arquivo num preview de Mermaid ve verde/amarelo/vermelho.
 *   2. O `.png` e o que se le no repositorio e o que vai para o TCC, impresso.
 *      La a cor nao sobrevive, e a escala de cinza com tracejado distingue os
 *      tres status sem depender de cor nenhuma.
 *   Este script e a ponte: troca a paleta em uma copia temporaria, renderiza e
 *   joga a copia fora. O arquivo versionado nunca perde a cor.
 *
 *   3. Antes disso, cada mapa tinha sido gerado com um `-w` diferente (1600 aqui,
 *      1800 ali) e ninguem sabia qual. Regerar com o valor errado reescalava a
 *      figura e sujava o diff. Agora a largura mora aqui, uma so.
 *
 * Uso: node scripts/render-mapas.mjs [nome-do-mapa ...]
 *      Sem argumento, renderiza todos.
 */

import { readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const IMG = join(ROOT, 'docs', 'rotinas', 'img')

/** Uma largura para todos. Mudar aqui muda todos os mapas junto, de proposito. */
const LARGURA = 1800

/**
 * Paleta de impressao. As chaves sao os nomes de classe usados nos `.mmd`;
 * o valor e o corpo do `classDef` que substitui o colorido na hora de renderizar.
 *
 * `falta` e branco com tracejado fino e `meio` e cinza-claro com tracejado
 * largo: os tres status continuam distinguiveis numa fotocopia em preto e branco,
 * que e o pior caso de leitura do TCC.
 */
const CINZA = {
  ok:      'fill:#e5e7eb,stroke:#374151,stroke-width:2px,color:#111827',
  meio:    'fill:#f3f4f6,stroke:#6b7280,stroke-width:2px,color:#111827,stroke-dasharray:7 4',
  falta:   'fill:#ffffff,stroke:#9ca3af,stroke-width:1.5px,color:#4b5563,stroke-dasharray:4 4',
  grupo:   'fill:#fafafa,stroke:#d1d5db,stroke-width:1px,color:#374151',
  ator:    'fill:#374151,stroke:#111827,stroke-width:2px,color:#f9fafb',
  decisao: 'fill:#f3f4f6,stroke:#374151,stroke-width:2px,color:#111827',
}

/** Cor de aresta destacada (`linkStyle`) -> cinza escuro. */
const TRACO_CINZA = 'stroke:#4b5563'

/** Troca a paleta colorida pela de impressao. Nao toca em mais nada do arquivo. */
export function paraCinza(mmd) {
  return mmd
    .split('\n')
    .map((linha) => {
      const m = /^(\s*)classDef\s+(\w+)\s+/.exec(linha)
      if (m && m[2] in CINZA) return `${m[1]}classDef ${m[2]} ${CINZA[m[2]]}`
      if (/^\s*linkStyle\s/.test(linha)) return linha.replace(/stroke:#[0-9a-fA-F]{3,6}/, TRACO_CINZA)
      return linha
    })
    .join('\n')
}

function renderiza(nome) {
  const fonte = join(IMG, `${nome}.mmd`)
  const temp = join(IMG, `.${nome}.cinza.mmd`)
  const png = join(IMG, `${nome}.png`)
  writeFileSync(temp, paraCinza(readFileSync(fonte, 'utf8')))
  try {
    process.stdout.write(`  ${nome} … `)
    execFileSync(
      'npx',
      ['-y', '@mermaid-js/mermaid-cli', '-i', temp, '-o', png, '-w', String(LARGURA), '-b', 'white'],
      { stdio: 'ignore', shell: process.platform === 'win32' },
    )
    process.stdout.write('ok\n')
  } finally {
    rmSync(temp, { force: true })
  }
}

const pedidos = process.argv.slice(2)
const todos = readdirSync(IMG)
  .filter((f) => f.endsWith('.mmd') && !f.startsWith('.'))
  .map((f) => f.replace(/\.mmd$/, ''))
  .sort()

const alvos = pedidos.length ? pedidos : todos
const desconhecido = alvos.filter((a) => !todos.includes(a))
if (desconhecido.length) {
  console.error(`mapa inexistente: ${desconhecido.join(', ')}`)
  console.error(`disponiveis: ${todos.join(', ')}`)
  process.exit(1)
}

console.log(`Renderizando ${alvos.length} mapa(s) em ${LARGURA}px, paleta de impressao:`)
for (const nome of alvos) renderiza(nome)
console.log('\nA cor continua nos .mmd; o cinza vive so nos .png.')
