// Tipos, constantes e helpers puros do dominio de Clientes.
// Espelha src/lib/orders.ts: mantido fora de qualquer arquivo 'use server' para
// poder ser importado tanto por Server Actions quanto por Client Components, e
// testado isoladamente. Nada aqui toca o banco nem next/* — o gate de completude
// roda no client (feedback em tempo real) e no servidor (defesa em profundidade).

export type PersonType = 'pf' | 'pj'

// 27 unidades federativas brasileiras (26 estados + DF).
export const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
] as const

// Subconjunto de campos de um cliente relevante para a completude fiscal.
// `name` e o rotulo de exibicao (PF = nome completo; PJ = nome fantasia/razao).
export interface FiscalCustomer {
  name: string
  person_type: PersonType | null
  document: string | null
  email: string | null
  legal_name: string | null
  trade_name: string | null
  state_registration: string | null
  ie_exempt: boolean | null
  zip_code: string | null
  street: string | null
  address_number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
}

// --- Helpers de formato (puros) ---

/** Remove tudo que nao for digito. Base de toda validacao de documento/CEP. */
export function onlyDigits(s: string | null | undefined): string {
  return (s ?? '').replace(/\D/g, '')
}

/** Todos os caracteres iguais? (ex.: "11111111111" — invalido para CPF/CNPJ). */
function allSame(s: string): boolean {
  return s.length > 0 && /^(\d)\1+$/.test(s)
}

/**
 * Valida CPF: 11 digitos + os dois digitos verificadores; rejeita sequencias
 * repetidas. Aceita entrada mascarada (normaliza via onlyDigits).
 */
export function isValidCPF(doc: string | null | undefined): boolean {
  const cpf = onlyDigits(doc)
  if (cpf.length !== 11 || allSame(cpf)) return false

  const calcCheck = (len: number): number => {
    let sum = 0
    for (let i = 0; i < len; i++) {
      sum += Number(cpf[i]) * (len + 1 - i)
    }
    const mod = sum % 11
    return mod < 2 ? 0 : 11 - mod
  }

  return calcCheck(9) === Number(cpf[9]) && calcCheck(10) === Number(cpf[10])
}

/**
 * Valida CNPJ: 14 digitos + os dois digitos verificadores; rejeita sequencias
 * repetidas. Aceita entrada mascarada (normaliza via onlyDigits).
 */
export function isValidCNPJ(doc: string | null | undefined): boolean {
  const cnpj = onlyDigits(doc)
  if (cnpj.length !== 14 || allSame(cnpj)) return false

  // Pesos ciclicos 2..9 da direita para a esquerda sobre os `len` primeiros digitos.
  const calcCheck = (len: number): number => {
    let sum = 0
    let weight = 2
    for (let i = len - 1; i >= 0; i--) {
      sum += Number(cnpj[i]) * weight
      weight = weight === 9 ? 2 : weight + 1
    }
    const mod = sum % 11
    return mod < 2 ? 0 : 11 - mod
  }

  return calcCheck(12) === Number(cnpj[12]) && calcCheck(13) === Number(cnpj[13])
}

/** Regex simples e segura para e-mail (sem catastrophic backtracking). */
export function isValidEmail(email: string | null | undefined): boolean {
  const v = (email ?? '').trim()
  if (!v) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

/** CEP valido = 8 digitos (aceita mascarado). */
export function isValidCEP(cep: string | null | undefined): boolean {
  return onlyDigits(cep).length === 8
}

/** UF valida = pertence a UFS (case-insensitive). */
export function isValidUF(uf: string | null | undefined): boolean {
  const v = (uf ?? '').trim().toUpperCase()
  return (UFS as readonly string[]).includes(v)
}

// --- Formatadores de exibicao (a mascara e responsabilidade da UI) ---

export function formatCPF(doc: string | null | undefined): string {
  const d = onlyDigits(doc)
  if (d.length !== 11) return d
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function formatCNPJ(doc: string | null | undefined): string {
  const d = onlyDigits(doc)
  if (d.length !== 14) return d
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function formatCEP(cep: string | null | undefined): string {
  const d = onlyDigits(cep)
  if (d.length !== 8) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

/** Formata o documento conforme o tipo de pessoa (CPF para PF, CNPJ para PJ). */
export function formatDocument(
  doc: string | null | undefined,
  personType: PersonType | null,
): string {
  if (!doc) return ''
  if (personType === 'pj') return formatCNPJ(doc)
  if (personType === 'pf') return formatCPF(doc)
  return onlyDigits(doc)
}

// --- Completude fiscal (fonte unica da verdade) ---

/**
 * Lista, em rotulos legiveis, os campos faltantes ou invalidos para emitir NF.
 * Regra: minimo legal brasileiro + e-mail obrigatorio.
 *   - Comum (PF e PJ): e-mail + endereco completo (CEP, logradouro, numero,
 *     bairro, cidade, UF valida).
 *   - PF: tipo 'pf', nome, CPF valido.
 *   - PJ: tipo 'pj', razao social, CNPJ valido, IE informada OU isento de IE.
 * A UI usa para destacar o que falta; o servidor usa para a mensagem de bloqueio.
 */
export function getMissingFiscalFields(c: FiscalCustomer): string[] {
  const missing: string[] = []

  if (c.person_type !== 'pf' && c.person_type !== 'pj') {
    missing.push('Tipo de pessoa (PF/PJ)')
  }

  if (c.person_type === 'pf') {
    if (!c.name?.trim()) missing.push('Nome')
    if (!isValidCPF(c.document)) missing.push(c.document ? 'CPF inválido' : 'CPF')
  }

  if (c.person_type === 'pj') {
    if (!c.legal_name?.trim()) missing.push('Razão social')
    if (!isValidCNPJ(c.document)) missing.push(c.document ? 'CNPJ inválido' : 'CNPJ')
    if (c.ie_exempt !== true && !c.state_registration?.trim()) {
      missing.push('Inscrição Estadual (ou isento)')
    }
  }

  // Comum a PF e PJ: e-mail + endereco
  if (!isValidEmail(c.email)) missing.push(c.email ? 'E-mail inválido' : 'E-mail')
  if (!isValidCEP(c.zip_code)) missing.push(c.zip_code ? 'CEP inválido' : 'CEP')
  if (!c.street?.trim()) missing.push('Logradouro')
  if (!c.address_number?.trim()) missing.push('Número')
  if (!c.neighborhood?.trim()) missing.push('Bairro')
  if (!c.city?.trim()) missing.push('Cidade')
  if (!isValidUF(c.state)) missing.push(c.state ? 'UF inválida' : 'UF')

  return missing
}

/** Cliente fiscalmente completo = nenhum campo faltante/invalido. */
export function isFiscallyComplete(c: FiscalCustomer): boolean {
  return getMissingFiscalFields(c).length === 0
}

// --- Validadores de payload (centralizam mensagens, estilo validateOrderItems) ---

/** Cadastro simples: so o nome e obrigatorio. Retorna mensagem ou null. */
export function validateSimpleCustomer(data: { name?: string | null }): string | null {
  if (!data.name?.trim()) return 'Nome do cliente é obrigatório.'
  return null
}

/**
 * Valida um cliente para uso fiscal (NF). Retorna a mensagem de bloqueio com os
 * campos faltantes, ou null se completo. Ex.: "Faltam para NF: CNPJ, e-mail, CEP".
 */
export function validateFiscalCustomer(c: FiscalCustomer): string | null {
  const missing = getMissingFiscalFields(c)
  if (missing.length === 0) return null
  return `Faltam para NF: ${missing.join(', ')}`
}
