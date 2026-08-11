// Sentry no runtime edge — hoje so o middleware (src/middleware.ts).
// Carregado por instrumentation.ts quando NEXT_RUNTIME === 'edge'.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
})
