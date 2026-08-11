// Sentry no servidor (Node): Server Actions, Server Components e route handlers.
// Carregado por instrumentation.ts quando NEXT_RUNTIME === 'nodejs'.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  // Sem DSN o SDK vira no-op: o erro continua indo para o console e nada e
  // enviado. E o comportamento desejado em desenvolvimento e no CI.
  dsn: process.env.SENTRY_DSN,

  // So erro. Sem APM: tracing gera volume alto e nao responde a pergunta que
  // motivou a instrumentacao ("o Gilberto disse que deu erro — o que houve?").
  tracesSampleRate: 0,

  // 'production' | 'preview' | 'development' na Vercel. Separa erro de preview
  // de erro real de producao no painel.
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  // Nao enviar corpo de requisicao nem cookies. O sistema trafega dado de
  // cliente (documento, telefone) e senha em formulario de troca.
  sendDefaultPii: false,
})
