import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */

// Em dev o Next usa eval (HMR) e websocket; HSTS/upgrade-insecure nao podem valer
// em localhost (HTTP) senao quebram o `next dev`. Por isso a CSP/headers variam
// por ambiente: estrita em producao, permissiva o suficiente em desenvolvimento.
const isProd = process.env.NODE_ENV === 'production'

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' libera os scripts inline de hidratacao do Next. Seguro aqui:
  // nao ha dangerouslySetInnerHTML nem script inline proprio, e o React escapa tudo.
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  // tile.openstreetmap.org: tiles do mapa de fornecedores (P11 F4, Leaflet).
  "img-src 'self' data: blob: https://tile.openstreetmap.org",
  "font-src 'self'",
  // *.ingest.sentry.io: destino do SDK do Sentry no browser. Sem liberar, o
  // navegador bloqueia o envio em silencio e o painel de erros fica vazio.
  // O sufixo regional (us/de) varia conforme a organizacao — os tres cobrem
  // qualquer DSN sem precisar mexer aqui de novo.
  `connect-src 'self' https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io${isProd ? '' : ' ws:'}`,
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  ...(isProd
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
]

const nextConfig = {
  // Evita que o bundler tente internalizar drivers nativos de postgres.
  // Necessário no Vercel para pg e @neondatabase/serverless funcionarem corretamente.
  serverExternalPackages: ['pg', 'pg-native', '@neondatabase/serverless'],

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

// Envio de source maps ao Sentry — sem isso o stack trace chega minificado e
// nao aponta a linha do arquivo original. So e aplicado quando o token existe:
// em desenvolvimento e no CI o wrapper e dispensado e o build segue igual.
// Requer SENTRY_AUTH_TOKEN, SENTRY_ORG e SENTRY_PROJECT no painel da Vercel.
export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      // Nao publica os source maps junto do bundle: eles sobem para o Sentry e
      // sao apagados do output, para nao expor o codigo-fonte no navegador.
      sourcemaps: { deleteSourcemapsAfterUpload: true },
    })
  : nextConfig
