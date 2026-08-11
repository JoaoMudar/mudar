/**
 * Teste isolado do DSN do Sentry — `npm run sentry:teste`
 *
 * Nao carrega o Next nem a aplicacao: prova que o DSN esta correto, que a rede
 * alcanca o Sentry e que o evento aparece no painel. Se este script funcionar e
 * mesmo assim nada aparecer com o app rodando, o problema esta na integracao
 * (ou na CSP, no caso do browser) — e nao no DSN.
 *
 * Vive em scripts/ e nao fora do projeto porque o Node resolve `@sentry/nextjs`
 * a partir da pasta do arquivo, nao do diretorio de trabalho.
 */
import fs from 'fs'
import path from 'path'
import * as Sentry from '@sentry/nextjs'

// Le o .env.local do mesmo jeito que scripts/migrate.ts (o projeto nao usa dotenv).
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    if (!process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1)
  }
}

const dsn = process.env.SENTRY_DSN
if (!dsn) {
  console.error('✗ SENTRY_DSN nao encontrada no .env.local')
  console.error('  Acrescente SENTRY_DSN e NEXT_PUBLIC_SENTRY_DSN e rode de novo.')
  process.exit(1)
}

let host: string
try {
  host = new URL(dsn).host
} catch {
  console.error('✗ SENTRY_DSN nao e uma URL valida:', dsn.slice(0, 40))
  process.exit(1)
}

// Confere se o host de ingest esta liberado no connect-src de next.config.mjs.
const LIBERADOS = ['.ingest.sentry.io', '.ingest.us.sentry.io', '.ingest.de.sentry.io']
const naCsp = LIBERADOS.some((sufixo) => host.endsWith(sufixo))

console.log('DSN host :', host)
console.log('Na CSP   :', naCsp ? '✓ sim' : '✗ NAO — o SDK do browser sera bloqueado')
if (!naCsp) {
  console.log('           o connect-src de next.config.mjs precisa ganhar este host')
}

Sentry.init({ dsn, tracesSampleRate: 0, environment: 'teste-local' })

const id = Sentry.captureException(
  new Error('Teste de instalacao do Sentry — pode fechar este erro'),
)

// flush: sem isso o processo termina antes de o evento sair.
Sentry.flush(5000).then((ok) => {
  console.log('Evento   :', ok ? `✓ enviado (id ${id})` : '✗ falhou o envio')
  if (ok) {
    console.log('\nAbra Issues no painel do Sentry. Deve aparecer em segundos,')
    console.log('com environment = teste-local.')
  }
  process.exit(ok ? 0 : 1)
})
