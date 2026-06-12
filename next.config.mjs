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
  `connect-src 'self'${isProd ? '' : ' ws:'}`,
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

export default nextConfig
