import { describe, it, expect } from 'vitest'
import { mapOpenCnpj, mapBrasilApi, type OpenCnpjResponse, type BrasilApiResponse } from '../cnpj'

describe('mapOpenCnpj', () => {
  it('mapeia os campos principais e normaliza CEP/UF/e-mail', () => {
    const r: OpenCnpjResponse = {
      razao_social: 'BANCO DO BRASIL SA',
      nome_fantasia: 'DIRECAO GERAL',
      email: 'SECEX@BB.COM.BR',
      cep: '70040-912',
      logradouro: 'SAUN QUADRA 5',
      numero: 'SN',
      complemento: 'ANDAR T',
      bairro: 'ASA NORTE',
      municipio: 'BRASILIA',
      uf: 'df',
      situacao_cadastral: 'Ativa',
      telefones: [{ ddd: '61', numero: '34939002', is_fax: false }],
    }
    const d = mapOpenCnpj(r)
    expect(d.legal_name).toBe('BANCO DO BRASIL SA')
    expect(d.trade_name).toBe('DIRECAO GERAL')
    expect(d.email).toBe('secex@bb.com.br') // minusculas
    expect(d.zip_code).toBe('70040912') // so digitos
    expect(d.state).toBe('DF') // maiusculas
    expect(d.city).toBe('BRASILIA')
    expect(d.address_number).toBe('SN')
    expect(d.phone).toBe('(61) 34939002')
    expect(d.status).toBe('Ativa')
  })

  it('ignora telefone de fax e usa o primeiro nao-fax', () => {
    const d = mapOpenCnpj({
      telefones: [
        { ddd: '47', numero: '111', is_fax: true },
        { ddd: '47', numero: '222', is_fax: false },
      ],
    })
    expect(d.phone).toBe('(47) 222')
  })

  it('telefone sem DDD retorna so o numero', () => {
    expect(mapOpenCnpj({ telefones: [{ numero: '99999' }] }).phone).toBe('99999')
  })

  it('campos ausentes viram string vazia (nao quebra)', () => {
    const d = mapOpenCnpj({})
    expect(d.legal_name).toBe('')
    expect(d.trade_name).toBe('')
    expect(d.phone).toBe('')
    expect(d.zip_code).toBe('')
    expect(d.state).toBe('')
    expect(d.status).toBe('')
  })
})

describe('mapBrasilApi', () => {
  it('mapeia os campos e normaliza telefone/CEP/UF/e-mail/situacao', () => {
    const r: BrasilApiResponse = {
      razao_social: 'BANCO DO BRASIL SA',
      nome_fantasia: 'DIRECAO GERAL',
      email: 'SECEX@BB.COM.BR',
      ddd_telefone_1: '6134939002',
      cep: '70040-912',
      logradouro: 'SAUN QUADRA 5',
      numero: 'SN',
      complemento: 'ANDAR T',
      bairro: 'ASA NORTE',
      municipio: 'BRASILIA',
      uf: 'df',
      descricao_situacao_cadastral: 'ATIVA',
    }
    const d = mapBrasilApi(r)
    expect(d.legal_name).toBe('BANCO DO BRASIL SA')
    expect(d.trade_name).toBe('DIRECAO GERAL')
    expect(d.email).toBe('secex@bb.com.br') // minusculas
    expect(d.phone).toBe('(61) 34939002') // DDD entre parenteses
    expect(d.zip_code).toBe('70040912') // so digitos
    expect(d.state).toBe('DF') // maiusculas
    expect(d.city).toBe('BRASILIA')
    expect(d.status).toBe('ATIVA')
  })

  it('aceita CEP numerico', () => {
    expect(mapBrasilApi({ cep: 89010000 }).zip_code).toBe('89010000')
  })

  it('telefone com so DDD ou vazio nao quebra', () => {
    expect(mapBrasilApi({ ddd_telefone_1: '' }).phone).toBe('')
    expect(mapBrasilApi({ ddd_telefone_1: null }).phone).toBe('')
  })

  it('campos ausentes viram string vazia', () => {
    const d = mapBrasilApi({})
    expect(d.legal_name).toBe('')
    expect(d.phone).toBe('')
    expect(d.zip_code).toBe('')
    expect(d.state).toBe('')
    expect(d.status).toBe('')
  })
})
