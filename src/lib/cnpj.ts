// Consulta de CNPJ (autopreenchimento de cadastro fiscal).
// Mantido fora de qualquer arquivo 'use server' (igual a customers.ts) para ser
// importavel pelo client e testavel isoladamente. Nada aqui toca o banco nem faz
// fetch — so o mapeamento puro do retorno da API para os campos do formulario.
// A chamada HTTP em si fica na server action lookupCnpj (clientes/actions.ts).

import { onlyDigits } from './customers'

// Subconjunto de campos do cliente que conseguimos preencher a partir do CNPJ.
// IE (state_registration) nao vem na base publica — fica a cargo do usuario.
export interface CnpjData {
  legal_name: string
  trade_name: string
  email: string
  phone: string
  zip_code: string
  street: string
  address_number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  status: string // situacao cadastral (ex.: "Ativa")
}

// Formato do retorno da OpenCNPJ (api.opencnpj.org) — so os campos que usamos.
interface OpenCnpjPhone {
  ddd?: string | null
  numero?: string | null
  is_fax?: boolean | null
}
export interface OpenCnpjResponse {
  cnpj?: string
  razao_social?: string | null
  nome_fantasia?: string | null
  email?: string | null
  telefones?: OpenCnpjPhone[] | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cep?: string | null
  uf?: string | null
  municipio?: string | null
  situacao_cadastral?: string | null
}

// Formato do retorno da BrasilAPI (brasilapi.com.br/api/cnpj/v1) — provedor
// primario, por ser alcancavel onde a OpenCNPJ as vezes e bloqueada por rede/ISP.
// Telefone vem como string unica (DDD+numero) e CEP pode vir como numero.
export interface BrasilApiResponse {
  cnpj?: string
  razao_social?: string | null
  nome_fantasia?: string | null
  email?: string | null
  ddd_telefone_1?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cep?: string | number | null
  uf?: string | null
  municipio?: string | null
  descricao_situacao_cadastral?: string | null
}

const clean = (v: string | null | undefined) => (v ?? '').trim()

// Primeiro telefone nao-fax, formatado "(DD) NUMERO". Vazio se nao houver.
function firstPhone(phones: OpenCnpjPhone[] | null | undefined): string {
  if (!phones || phones.length === 0) return ''
  const p = phones.find((t) => !t.is_fax) ?? phones[0]
  const ddd = onlyDigits(p.ddd)
  const num = onlyDigits(p.numero)
  if (!ddd && !num) return ''
  return ddd ? `(${ddd}) ${num}` : num
}

/**
 * Mapeia o retorno da OpenCNPJ para os campos do formulario de cliente.
 * Normaliza CEP para so-digitos e UF para maiusculas; e-mail para minusculas.
 */
export function mapOpenCnpj(r: OpenCnpjResponse): CnpjData {
  return {
    legal_name: clean(r.razao_social),
    trade_name: clean(r.nome_fantasia),
    email: clean(r.email).toLowerCase(),
    phone: firstPhone(r.telefones),
    zip_code: onlyDigits(r.cep).slice(0, 8),
    street: clean(r.logradouro),
    address_number: clean(r.numero),
    complement: clean(r.complemento),
    neighborhood: clean(r.bairro),
    city: clean(r.municipio),
    state: clean(r.uf).toUpperCase(),
    status: clean(r.situacao_cadastral),
  }
}

// Telefone da BrasilAPI ("DDNNNNNNNN") -> "(DD) NNNNNNNN". Vazio se nao houver.
function brasilApiPhone(raw: string | null | undefined): string {
  const d = onlyDigits(raw)
  if (!d) return ''
  if (d.length <= 2) return d
  return `(${d.slice(0, 2)}) ${d.slice(2)}`
}

/**
 * Mapeia o retorno da BrasilAPI para os campos do formulario de cliente.
 * Mesmas normalizacoes do mapOpenCnpj (CEP so-digitos, UF maiuscula, e-mail minusculo).
 */
export function mapBrasilApi(r: BrasilApiResponse): CnpjData {
  return {
    legal_name: clean(r.razao_social),
    trade_name: clean(r.nome_fantasia),
    email: clean(r.email).toLowerCase(),
    phone: brasilApiPhone(r.ddd_telefone_1),
    zip_code: onlyDigits(r.cep == null ? '' : String(r.cep)).slice(0, 8),
    street: clean(r.logradouro),
    address_number: clean(r.numero),
    complement: clean(r.complemento),
    neighborhood: clean(r.bairro),
    city: clean(r.municipio),
    state: clean(r.uf).toUpperCase(),
    status: clean(r.descricao_situacao_cadastral),
  }
}
