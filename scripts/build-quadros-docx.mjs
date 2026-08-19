#!/usr/bin/env node
/**
 * Gera quadros-regras-de-negocio-e-requisitos.docx a partir de
 * docs/engenharia/B-requisitos/B4-quadros-tcc.md.
 *
 * Por que existe: a versao anterior desse .docx foi montada a mao e ficou dois
 * meses defasada dos artefatos — RN-44 e RF-62 com o texto antigo, 23 regras
 * faltando, totais errados. Enquanto o arquivo for derivado, isso nao se repete.
 *
 * A formatacao reproduz a do .docx anterior: Arial, corpo 10 pt, titulo de
 * quadro 12 pt, bordas simples, cabecalho sombreado em D9D9D9, pagina A4 com
 * margens ABNT. Sem dependencia externa — o .docx e um zip de XML, e tanto o
 * zip quanto o XML sao escritos aqui.
 *
 * Uso: node scripts/build-quadros-docx.mjs [-o caminho/saida.docx]
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { deflateRawSync, crc32 } from 'node:zlib'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FONTE_MD = join(ROOT, 'docs', 'engenharia', 'B-requisitos', 'B4-quadros-tcc.md')

const argO = process.argv.indexOf('-o')
const SAIDA = argO > -1 && process.argv[argO + 1]
  ? process.argv[argO + 1]
  : join(ROOT, 'quadros-regras-de-negocio-e-requisitos.docx')

/** Titulos de secao (Heading 1), inseridos antes do quadro indicado. */
const SECOES = {
  1: 'QUADROS – REGRAS DE NEGÓCIO',
  10: 'QUADROS – REQUISITOS E VÍNCULO COM AS REGRAS DE NEGÓCIO',
}

/** Largura das colunas por quadro; a soma e sempre 9071 dxa (mancha A4 ABNT). */
const LARGURAS = {
  9: [4000, 3071, 2000],
  10: [900, 2100, 4571, 1500],
  11: [900, 2100, 4571, 1500],
  12: [1300, 3271, 2000, 2500],
  13: [3071, 1500, 1500, 1500, 1500],
  padrao: [1200, 7871],
}

/** Alinhamento por coluna: c = centro, l = esquerda. Sem entrada, a 1a coluna
 *  vai centralizada e em negrito, e as demais a esquerda. */
const ALINHAMENTO = {
  9: ['l', 'l', 'c'],
  13: ['l', 'c', 'c', 'c', 'c'],
}

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const BORDA = ['top', 'left', 'bottom', 'right']
  .map((l) => '<w:' + l + ' w:val="single" w:color="000000" w:sz="4"/>').join('')
const BORDA_TBL = BORDA
  + '<w:insideH w:val="single" w:color="auto" w:sz="4"/>'
  + '<w:insideV w:val="single" w:color="auto" w:sz="4"/>'
const MARGENS = '<w:tcMar><w:top w:type="dxa" w:w="60"/><w:left w:type="dxa" w:w="80"/>'
  + '<w:bottom w:type="dxa" w:w="60"/><w:right w:type="dxa" w:w="80"/></w:tcMar>'
const ARIAL = '<w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/>'

function corrida(texto, opcoes) {
  const { negrito = false, tamanho = 20 } = opcoes || {}
  const b = negrito ? '<w:b/><w:bCs/>' : '<w:b w:val="false"/><w:bCs w:val="false"/>'
  return '<w:r><w:rPr>' + ARIAL + b
    + '<w:sz w:val="' + tamanho + '"/><w:szCs w:val="' + tamanho + '"/></w:rPr>'
    + '<w:t xml:space="preserve">' + esc(texto) + '</w:t></w:r>'
}

function paragrafo(texto, opcoes) {
  const { jc = 'left', negrito = false, tamanho = 20, antes = 20, depois = 20, estilo = null } = opcoes || {}
  const st = estilo ? '<w:pStyle w:val="' + estilo + '"/>' : ''
  return '<w:p><w:pPr>' + st
    + '<w:spacing w:after="' + depois + '" w:before="' + antes + '" w:line="240"/>'
    + '<w:jc w:val="' + jc + '"/></w:pPr>'
    + corrida(texto, { negrito, tamanho }) + '</w:p>'
}

function celula(texto, largura, opcoes) {
  const { cabecalho = false, jc = 'left', negrito = false, span = 0, vMerge = null } = opcoes || {}
  const shd = cabecalho ? '<w:shd w:fill="D9D9D9" w:color="auto" w:val="clear"/>' : ''
  const gs = span ? '<w:gridSpan w:val="' + span + '"/>' : ''
  const vm = vMerge ? '<w:vMerge w:val="' + vMerge + '"/>' : ''
  return '<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="' + largura + '"/>' + vm + gs
    + '<w:tcBorders>' + BORDA + '</w:tcBorders>' + shd + MARGENS
    + '<w:vAlign w:val="center"/></w:tcPr>'
    + '<w:p><w:pPr><w:spacing w:after="20" w:before="20" w:line="240"/>'
    + '<w:jc w:val="' + jc + '"/></w:pPr>'
    + corrida(texto, { negrito: cabecalho || negrito }) + '</w:p></w:tc>'
}

const linha = (celulas, cabecalho) =>
  '<w:tr><w:trPr><w:cantSplit/>' + (cabecalho ? '<w:tblHeader/>' : '') + '</w:trPr>'
  + celulas + '</w:tr>'

const tabela = (larguras, linhas) =>
  '<w:tbl><w:tblPr><w:tblW w:type="dxa" w:w="9071"/>'
  + '<w:tblBorders>' + BORDA_TBL + '</w:tblBorders></w:tblPr><w:tblGrid>'
  + larguras.map((w) => '<w:gridCol w:w="' + w + '"/>').join('')
  + '</w:tblGrid>' + linhas.join('') + '</w:tbl>'

// ---------------------------------------------------------------- leitura do md

/** Extrai os quadros do B4: titulo, linhas da tabela e a linha de fonte. */
function leQuadros(md) {
  const quadros = []
  let atual = null
  for (const bruta of md.split('\n')) {
    const l = bruta.trim()
    const t = /^## Quadro (\d+) – (.+)$/.exec(l)
    if (t) {
      atual = { numero: Number(t[1]), titulo: t[2], linhas: [], fonte: '' }
      quadros.push(atual)
      continue
    }
    if (!atual) continue
    if (l.startsWith('Fonte:')) { atual.fonte = l; continue }
    if (!l.startsWith('|') || !l.endsWith('|')) continue
    const cols = l.slice(1, -1).split('|').map((c) => c.trim())
    if (cols.every((c) => /^:?-{3,}:?$/.test(c))) continue // separador do markdown
    atual.linhas.push(cols.map((c) => c.replace(/\*\*/g, '').replace(/`/g, '')))
  }
  return quadros
}

/** O Quadro 13 tem cabecalho de dois niveis, com celulas mescladas. */
function cabecalhoQuadro13(larguras) {
  const [c0, c1, c2, c3, c4] = larguras
  const l1 = celula('Origem', c0, { cabecalho: true, jc: 'center', vMerge: 'restart' })
    + celula('Requisitos funcionais', c1 + c2, { cabecalho: true, jc: 'center', span: 2 })
    + celula('Requisitos não funcionais', c3 + c4, { cabecalho: true, jc: 'center', span: 2 })
  const l2 = celula('', c0, { cabecalho: true, jc: 'center', vMerge: 'continue' })
    + celula('Qtd.', c1, { cabecalho: true, jc: 'center' })
    + celula('%', c2, { cabecalho: true, jc: 'center' })
    + celula('Qtd.', c3, { cabecalho: true, jc: 'center' })
    + celula('%', c4, { cabecalho: true, jc: 'center' })
  return [linha(l1, true), linha(l2, true)]
}

function montaQuadro(q) {
  const larguras = LARGURAS[q.numero] || LARGURAS.padrao
  const alinha = ALINHAMENTO[q.numero] || null
  const partes = []

  if (SECOES[q.numero]) {
    partes.push(paragrafo(SECOES[q.numero], {
      estilo: 'Heading1', negrito: true, tamanho: 24, antes: 360, depois: 180,
    }))
  }
  partes.push(paragrafo('Quadro ' + q.numero + ' – ' + q.titulo, {
    tamanho: 24, antes: 240, depois: 60,
  }))

  const linhas = []
  const corpo = q.linhas.slice()
  if (q.numero === 13) {
    linhas.push(...cabecalhoQuadro13(larguras))
    corpo.shift() // o cabecalho achatado do markdown nao vai para o Word
  } else {
    const cab = corpo.shift()
    linhas.push(linha(cab.map(
      (c, i) => celula(c, larguras[i], { cabecalho: true, jc: 'center' })).join(''), true))
  }
  for (const l of corpo) {
    const total = /^total$/i.test(l[0])
    linhas.push(linha(l.map((c, i) => celula(c, larguras[i], {
      jc: alinha ? alinha[i] : (i === 0 ? 'center' : 'left'),
      negrito: total || (!alinha && i === 0),
    })).join(''), false))
  }
  partes.push(tabela(larguras, linhas))
  partes.push(paragrafo(q.fonte || 'Fonte: Elaborado pelo autor (2026).', { antes: 60, depois: 240 }))
  return partes.join('')
}

// ------------------------------------------------------------------ partes OOXML

const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

const documentXml = (corpo) => XML
  + '<w:document xmlns:w="' + NS_W + '"><w:body>' + corpo
  + '<w:sectPr><w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/>'
  + '<w:pgMar w:top="1701" w:right="1134" w:bottom="1134" w:left="1701"'
  + ' w:header="708" w:footer="708" w:gutter="0"/><w:pgNumType/>'
  + '<w:docGrid w:linePitch="360"/></w:sectPr></w:body></w:document>'

const STYLES_XML = XML + '<w:styles xmlns:w="' + NS_W + '">'
  + '<w:docDefaults><w:rPrDefault><w:rPr>' + ARIAL
  + '<w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:rPrDefault>'
  + '<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240"/></w:pPr></w:pPrDefault>'
  + '</w:docDefaults>'
  + '<w:style w:type="paragraph" w:styleId="Normal" w:default="1">'
  + '<w:name w:val="Normal"/><w:qFormat/></w:style>'
  + '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/>'
  + '<w:basedOn w:val="Normal"/><w:qFormat/>'
  + '<w:pPr><w:outlineLvl w:val="0"/></w:pPr>'
  + '<w:rPr>' + ARIAL + '<w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>'
  + '</w:style></w:styles>'

const CONTENT_TYPES = XML
  + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
  + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
  + '<Default Extension="xml" ContentType="application/xml"/>'
  + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
  + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
  + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
  + '</Types>'

const RELS_RAIZ = XML
  + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
  + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
  + '</Relationships>'

const RELS_DOC = XML
  + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
  + '</Relationships>'

const coreXml = (agora) => XML
  + '<cp:coreProperties'
  + ' xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"'
  + ' xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"'
  + ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
  + '<dc:title>Quadros de regras de negócio e requisitos</dc:title>'
  + '<dc:creator>Viveiro Mudar</dc:creator>'
  + '<cp:lastModifiedBy>scripts/build-quadros-docx.mjs</cp:lastModifiedBy>'
  + '<dcterms:created xsi:type="dcterms:W3CDTF">' + agora + '</dcterms:created>'
  + '<dcterms:modified xsi:type="dcterms:W3CDTF">' + agora + '</dcterms:modified>'
  + '</cp:coreProperties>'

// --------------------------------------------------------------------- zip cru

/** Escreve um zip minimo com deflate. O .docx e exatamente isto. */
function zip(arquivos) {
  const locais = []
  const centrais = []
  let deslocamento = 0
  for (const [nome, texto] of arquivos) {
    const cru = Buffer.from(texto, 'utf8')
    const comprimido = deflateRawSync(cru)
    const crc = crc32(cru)
    const nomeBuf = Buffer.from(nome, 'utf8')

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)      // versao necessaria
    local.writeUInt16LE(0x0800, 6)  // flag: nome em UTF-8
    local.writeUInt16LE(8, 8)       // metodo: deflate
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(comprimido.length, 18)
    local.writeUInt32LE(cru.length, 22)
    local.writeUInt16LE(nomeBuf.length, 26)
    locais.push(local, nomeBuf, comprimido)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(comprimido.length, 20)
    central.writeUInt32LE(cru.length, 24)
    central.writeUInt16LE(nomeBuf.length, 28)
    central.writeUInt32LE(deslocamento, 42)
    centrais.push(central, nomeBuf)

    deslocamento += 30 + nomeBuf.length + comprimido.length
  }
  const corpoCentral = Buffer.concat(centrais)
  const fim = Buffer.alloc(22)
  fim.writeUInt32LE(0x06054b50, 0)
  fim.writeUInt16LE(arquivos.length, 8)
  fim.writeUInt16LE(arquivos.length, 10)
  fim.writeUInt32LE(corpoCentral.length, 12)
  fim.writeUInt32LE(deslocamento, 16)
  return Buffer.concat([...locais, corpoCentral, fim])
}

// ------------------------------------------------------------------------ main

const quadros = leQuadros(readFileSync(FONTE_MD, 'utf8'))
if (quadros.length === 0) {
  console.error('Nenhum quadro encontrado em ' + FONTE_MD)
  process.exit(1)
}

const agora = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
const corpo = quadros.map(montaQuadro).join('')

writeFileSync(SAIDA, zip([
  ['[Content_Types].xml', CONTENT_TYPES],
  ['_rels/.rels', RELS_RAIZ],
  ['word/_rels/document.xml.rels', RELS_DOC],
  ['word/document.xml', documentXml(corpo)],
  ['word/styles.xml', STYLES_XML],
  ['docProps/core.xml', coreXml(agora)],
]))

for (const q of quadros) {
  const linhasDados = q.numero === 13 ? q.linhas.length - 1 : q.linhas.length - 1
  console.log('  Quadro ' + String(q.numero).padStart(2) + ' · '
    + String(linhasDados).padStart(2) + ' linhas · ' + q.titulo)
}
console.log('\n' + quadros.length + ' quadros → ' + SAIDA)
