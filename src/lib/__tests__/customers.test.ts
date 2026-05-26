import { describe, it, expect } from 'vitest'
import {
  onlyDigits,
  isValidCPF,
  isValidCNPJ,
  isValidEmail,
  isValidCEP,
  isValidUF,
  formatCPF,
  formatCNPJ,
  formatCEP,
  formatDocument,
  getMissingFiscalFields,
  isFiscallyComplete,
  validateSimpleCustomer,
  validateFiscalCustomer,
  type FiscalCustomer,
} from '../customers'

// Documentos validos conhecidos (digitos verificadores reais).
const VALID_CPF = '11144477735'
const VALID_CPF_2 = '52998224725'
const VALID_CNPJ = '11222333000181'

// Base de cliente completo para mutacao nos testes de completude.
function fullPF(over: Partial<FiscalCustomer> = {}): FiscalCustomer {
  return {
    name: 'João da Silva',
    person_type: 'pf',
    document: VALID_CPF,
    email: 'joao@example.com',
    legal_name: null,
    trade_name: null,
    state_registration: null,
    ie_exempt: null,
    zip_code: '89160000',
    street: 'Rua das Flores',
    address_number: '123',
    complement: null,
    neighborhood: 'Centro',
    city: 'Rio do Sul',
    state: 'SC',
    ...over,
  }
}

function fullPJ(over: Partial<FiscalCustomer> = {}): FiscalCustomer {
  return {
    name: 'Paisagismo Verde',
    person_type: 'pj',
    document: VALID_CNPJ,
    email: 'contato@verde.com.br',
    legal_name: 'Paisagismo Verde Ltda',
    trade_name: 'Verde',
    state_registration: '251234567',
    ie_exempt: false,
    zip_code: '89010000',
    street: 'Av. Brasil',
    address_number: '1000',
    complement: 'Sala 2',
    neighborhood: 'Velha',
    city: 'Blumenau',
    state: 'SC',
    ...over,
  }
}

describe('onlyDigits', () => {
  it('remove mascara e mantem so digitos', () => {
    expect(onlyDigits('111.444.777-35')).toBe('11144477735')
    expect(onlyDigits('11.222.333/0001-81')).toBe('11222333000181')
    expect(onlyDigits('89160-000')).toBe('89160000')
  })
  it('lida com null/undefined', () => {
    expect(onlyDigits(null)).toBe('')
    expect(onlyDigits(undefined)).toBe('')
  })
})

describe('isValidCPF', () => {
  it('aceita CPF valido com e sem mascara', () => {
    expect(isValidCPF(VALID_CPF)).toBe(true)
    expect(isValidCPF('111.444.777-35')).toBe(true)
    expect(isValidCPF(VALID_CPF_2)).toBe(true)
  })
  it('rejeita digito verificador errado', () => {
    expect(isValidCPF('11144477734')).toBe(false)
    expect(isValidCPF('52998224724')).toBe(false)
  })
  it('rejeita sequencia de digitos repetidos', () => {
    expect(isValidCPF('11111111111')).toBe(false)
    expect(isValidCPF('00000000000')).toBe(false)
  })
  it('rejeita tamanho errado e vazio', () => {
    expect(isValidCPF('1114447773')).toBe(false)
    expect(isValidCPF('111444777355')).toBe(false)
    expect(isValidCPF('')).toBe(false)
    expect(isValidCPF(null)).toBe(false)
  })
})

describe('isValidCNPJ', () => {
  it('aceita CNPJ valido com e sem mascara', () => {
    expect(isValidCNPJ(VALID_CNPJ)).toBe(true)
    expect(isValidCNPJ('11.222.333/0001-81')).toBe(true)
  })
  it('rejeita digito verificador errado', () => {
    expect(isValidCNPJ('11222333000180')).toBe(false)
    expect(isValidCNPJ('11222333000191')).toBe(false)
  })
  it('rejeita sequencia repetida e tamanho errado', () => {
    expect(isValidCNPJ('00000000000000')).toBe(false)
    expect(isValidCNPJ('1122233300018')).toBe(false)
    expect(isValidCNPJ('')).toBe(false)
    expect(isValidCNPJ(undefined)).toBe(false)
  })
})

describe('isValidEmail', () => {
  it('aceita e-mails validos', () => {
    expect(isValidEmail('a@b.com')).toBe(true)
    expect(isValidEmail('joao.silva@empresa.com.br')).toBe(true)
  })
  it('rejeita invalidos', () => {
    expect(isValidEmail('semarroba.com')).toBe(false)
    expect(isValidEmail('sem@dominio')).toBe(false)
    expect(isValidEmail('com espaco@x.com')).toBe(false)
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail(null)).toBe(false)
  })
})

describe('isValidCEP', () => {
  it('aceita 8 digitos (com/sem mascara)', () => {
    expect(isValidCEP('89160000')).toBe(true)
    expect(isValidCEP('89160-000')).toBe(true)
  })
  it('rejeita tamanho errado', () => {
    expect(isValidCEP('8916000')).toBe(false)
    expect(isValidCEP('')).toBe(false)
  })
})

describe('isValidUF', () => {
  it('aceita UF valida e normaliza caixa', () => {
    expect(isValidUF('SC')).toBe(true)
    expect(isValidUF('sc')).toBe(true)
    expect(isValidUF(' sp ')).toBe(true)
  })
  it('rejeita UF invalida', () => {
    expect(isValidUF('XX')).toBe(false)
    expect(isValidUF('')).toBe(false)
    expect(isValidUF(null)).toBe(false)
  })
})

describe('formatadores', () => {
  it('formata CPF/CNPJ/CEP quando o tamanho esta correto', () => {
    expect(formatCPF(VALID_CPF)).toBe('111.444.777-35')
    expect(formatCNPJ(VALID_CNPJ)).toBe('11.222.333/0001-81')
    expect(formatCEP('89160000')).toBe('89160-000')
  })
  it('retorna os digitos crus quando incompleto', () => {
    expect(formatCPF('111')).toBe('111')
    expect(formatCNPJ('112223')).toBe('112223')
  })
  it('formatDocument escolhe a mascara pelo tipo de pessoa', () => {
    expect(formatDocument(VALID_CPF, 'pf')).toBe('111.444.777-35')
    expect(formatDocument(VALID_CNPJ, 'pj')).toBe('11.222.333/0001-81')
    expect(formatDocument(VALID_CPF, null)).toBe(VALID_CPF)
    expect(formatDocument(null, 'pf')).toBe('')
  })
})

describe('getMissingFiscalFields / isFiscallyComplete', () => {
  it('PF completo -> vazio / completo', () => {
    expect(getMissingFiscalFields(fullPF())).toEqual([])
    expect(isFiscallyComplete(fullPF())).toBe(true)
  })

  it('PJ completo com IE -> completo', () => {
    expect(isFiscallyComplete(fullPJ())).toBe(true)
  })

  it('PJ completo com isencao de IE -> completo', () => {
    const c = fullPJ({ state_registration: null, ie_exempt: true })
    expect(isFiscallyComplete(c)).toBe(true)
  })

  it('PJ sem IE e sem isencao -> falta Inscricao Estadual', () => {
    const c = fullPJ({ state_registration: null, ie_exempt: false })
    expect(isFiscallyComplete(c)).toBe(false)
    expect(getMissingFiscalFields(c)).toContain('Inscrição Estadual (ou isento)')
  })

  it('falta e-mail aparece na lista', () => {
    expect(getMissingFiscalFields(fullPF({ email: null }))).toContain('E-mail')
    expect(getMissingFiscalFields(fullPF({ email: 'invalido' }))).toContain('E-mail inválido')
  })

  it('falta CEP / CEP invalido aparece na lista', () => {
    expect(getMissingFiscalFields(fullPF({ zip_code: null }))).toContain('CEP')
    expect(getMissingFiscalFields(fullPF({ zip_code: '123' }))).toContain('CEP inválido')
  })

  it('UF invalida aparece na lista', () => {
    expect(getMissingFiscalFields(fullPF({ state: 'XX' }))).toContain('UF inválida')
  })

  it('CPF invalido em PF aparece na lista', () => {
    expect(getMissingFiscalFields(fullPF({ document: '11144477734' }))).toContain('CPF inválido')
    expect(getMissingFiscalFields(fullPF({ document: null }))).toContain('CPF')
  })

  it('CNPJ invalido em PJ aparece na lista', () => {
    expect(getMissingFiscalFields(fullPJ({ document: '11222333000180' }))).toContain('CNPJ inválido')
  })

  it('cliente simples (person_type NULL) -> incompleto (lista nao vazia)', () => {
    const simples = fullPF({
      person_type: null,
      document: null,
      email: null,
      zip_code: null,
      street: null,
      address_number: null,
      neighborhood: null,
      city: null,
      state: null,
    })
    const missing = getMissingFiscalFields(simples)
    expect(missing.length).toBeGreaterThan(0)
    expect(missing).toContain('Tipo de pessoa (PF/PJ)')
    expect(isFiscallyComplete(simples)).toBe(false)
  })
})

describe('validateSimpleCustomer', () => {
  it('exige nome', () => {
    expect(validateSimpleCustomer({ name: '' })).toMatch(/obrigatório/i)
    expect(validateSimpleCustomer({ name: '   ' })).toMatch(/obrigatório/i)
    expect(validateSimpleCustomer({ name: null })).toMatch(/obrigatório/i)
  })
  it('aceita nome valido', () => {
    expect(validateSimpleCustomer({ name: 'João' })).toBeNull()
  })
})

describe('validateFiscalCustomer', () => {
  it('retorna null quando completo', () => {
    expect(validateFiscalCustomer(fullPF())).toBeNull()
  })
  it('lista os campos faltantes na mensagem', () => {
    const msg = validateFiscalCustomer(fullPF({ document: null, email: null }))
    expect(msg).toMatch(/Faltam para NF/i)
    expect(msg).toContain('CPF')
    expect(msg).toContain('E-mail')
  })
})
