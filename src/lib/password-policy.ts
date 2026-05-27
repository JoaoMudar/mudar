// Politica de senha do sistema (decisao: moderada, alinhada ao NIST 800-63B).
// Prioriza comprimento sobre complexidade — nao exige mistura de maiuscula/numero/
// simbolo, o que e mais seguro na pratica e menos frustrante para equipe nao-tecnica.
// Modulo simples (sem 'use server') para poder ser importado por arquivos de acao.

export const MIN_PASSWORD_LENGTH = 8
// Teto contra DoS de CPU: scrypt sobre uma senha gigante e caro. 72 e o limite
// classico (bcrypt) e mais que suficiente para qualquer senha real.
export const MAX_PASSWORD_LENGTH = 72

// Senhas mais comuns/vazadas (lista enxuta) — rejeitadas mesmo respeitando o tamanho.
const COMMON_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', '123123123', '12345678910',
  'password', 'password1', 'passw0rd', 'senha1234', 'senhasenha',
  'qwertyui', 'qwerty123', 'qwertyuiop', 'iloveyou', 'sunshine',
  'princess', 'football', 'baseball', 'abc12345', 'a1b2c3d4',
  '11111111', '00000000', 'aaaaaaaa', 'asdfghjk', 'zxcvbnm1',
])

// Raizes obvias do dominio/contexto: rejeitadas mesmo com digitos no fim
// (ex.: "viveiro2024", "senha123", "mudar01").
const OBVIOUS_STEMS = [
  'senha', 'password', 'viveiro', 'viveiromudar', 'mudar',
  'admin', 'qwerty', 'gilberto', 'debora',
]

/**
 * Valida uma senha contra a politica. Retorna a mensagem de erro (string) quando
 * invalida, ou `null` quando aceitavel. Mensagens em PT, prontas para a UI.
 */
export function validatePassword(pw: unknown): string | null {
  if (typeof pw !== 'string') return 'Senha inválida.'
  if (pw.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`
  }
  if (pw.length > MAX_PASSWORD_LENGTH) {
    return `A senha deve ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.`
  }

  const lower = pw.toLowerCase()
  if (COMMON_PASSWORDS.has(lower)) {
    return 'Essa senha é muito comum. Escolha uma mais difícil de adivinhar.'
  }

  // Tira digitos do fim para pegar variacoes triviais ("viveiro2024" -> "viveiro").
  const stem = lower.replace(/\d+$/, '')
  if (OBVIOUS_STEMS.includes(stem)) {
    return 'Essa senha é muito fácil de adivinhar. Use algo mais pessoal e único.'
  }

  return null
}
