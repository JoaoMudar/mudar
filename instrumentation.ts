// Ponto de entrada de instrumentacao do Next. Roda uma vez por runtime, antes
// de qualquer codigo da aplicacao.
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Captura erro nao tratado de Server Component, Server Action e route handler.
// Sem isso, so chegariam ao Sentry os erros reportados a mao — e o caso mais
// perigoso e justamente o que ninguem previu.
export const onRequestError = Sentry.captureRequestError
