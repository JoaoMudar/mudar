// Utilitarios de data para a rotina de pedidos/entregas.
// Funcoes puras, sem dependencia de timezone externo (operam em horario local).

/** true se a data cai em sabado (6) ou domingo (0). */
export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

/** Retorna uma nova data somando (ou subtraindo) dias. */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * Dia util anterior a uma data de entrega (= dia de carregamento).
 * Considera uteis segunda a sexta; pula fim de semana.
 * Ex: entrega segunda -> carregamento sexta; entrega terca -> segunda.
 * Feriados nao sao considerados (simplicidade).
 */
export function getPreviousBusinessDay(date: Date): Date {
  let d = addDays(date, -1)
  while (isWeekend(d)) {
    d = addDays(d, -1)
  }
  return d
}

/** true se as duas datas sao o mesmo dia (ano/mes/dia local). */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Converte uma data para 'YYYY-MM-DD' em horario local. */
export function toISODateLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
