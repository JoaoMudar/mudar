// Sanitiza erros de Server Actions: registra o detalhe no servidor e devolve
// uma mensagem segura para o cliente, sem vazar internals do banco (falha de
// information disclosure). Detecta violacao de unicidade para uma mensagem amigavel.
//
// E tambem o funil de observabilidade: todo erro de Server Action passa por
// aqui, entao e o unico lugar que precisa reportar ao Sentry.
import * as Sentry from '@sentry/nextjs'

const UNIQUE_VIOLATION = '23505' // Postgres unique_violation

export function safeErrorMessage(
  e: unknown,
  fallback = 'Não foi possível concluir a operação. Tente novamente.',
  context?: string,
): string {
  const msg = e instanceof Error ? e.message : String(e)
  const code = (e as { code?: string } | null)?.code

  // Log completo apenas no servidor (Vercel/console), nunca enviado ao cliente.
  console.error('[action error]', context ?? '', msg)

  if (code === UNIQUE_VIOLATION || msg.includes('unique') || msg.includes('duplicate')) {
    // Violacao de unicidade e erro de preenchimento do usuario, nao defeito do
    // sistema. Nao vai para o Sentry: encheria o painel de ruido e gastaria a
    // cota gratuita justamente com o que ja esta tratado.
    return 'Já existe um registro com esses dados.'
  }

  Sentry.captureException(e, context ? { tags: { action: context } } : undefined)
  return fallback
}
