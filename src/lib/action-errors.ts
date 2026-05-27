// Sanitiza erros de Server Actions: registra o detalhe no servidor e devolve
// uma mensagem segura para o cliente, sem vazar internals do banco (falha de
// information disclosure). Detecta violacao de unicidade para uma mensagem amigavel.

const UNIQUE_VIOLATION = '23505' // Postgres unique_violation

export function safeErrorMessage(
  e: unknown,
  fallback = 'Não foi possível concluir a operação. Tente novamente.',
): string {
  const msg = e instanceof Error ? e.message : String(e)
  const code = (e as { code?: string } | null)?.code

  // Log completo apenas no servidor (Vercel/console), nunca enviado ao cliente.
  console.error('[action error]', msg)

  if (code === UNIQUE_VIOLATION || msg.includes('unique') || msg.includes('duplicate')) {
    return 'Já existe um registro com esses dados.'
  }
  return fallback
}
