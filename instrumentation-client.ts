// Sentry no browser. No Next 16 este arquivo substitui o antigo
// sentry.client.config.ts e e carregado automaticamente.
//
// O envio sai do browser para o endpoint de ingest do Sentry, entao o host
// precisa estar liberado no `connect-src` da CSP em next.config.mjs — sem isso
// o navegador bloqueia a requisicao em silencio e o painel fica vazio.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
})

// Instrumenta as transicoes de rota do App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
