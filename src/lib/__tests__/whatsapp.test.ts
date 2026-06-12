import { describe, it, expect } from 'vitest'
import {
  buildQuoteRequestMessage,
  buildWaLink,
  normalizeBrazilPhone,
} from '../whatsapp'

describe('normalizeBrazilPhone', () => {
  it('celular com DDD (11 digitos) ganha DDI 55', () => {
    expect(normalizeBrazilPhone('48999998888')).toBe('5548999998888')
  })

  it('fixo com DDD (10 digitos) ganha DDI 55', () => {
    expect(normalizeBrazilPhone('4735210000')).toBe('554735210000')
  })

  it('mascara e espacos sao ignorados', () => {
    expect(normalizeBrazilPhone('(48) 99999-8888')).toBe('5548999998888')
  })

  it('+55 ja presente e preservado', () => {
    expect(normalizeBrazilPhone('+55 48 99999-8888')).toBe('5548999998888')
    expect(normalizeBrazilPhone('554735210000')).toBe('554735210000')
  })

  it('zero de tronco e removido', () => {
    expect(normalizeBrazilPhone('048 99999-8888')).toBe('5548999998888')
  })

  it('DDD 55 (regiao de Santa Maria/RS) nao e confundido com DDI', () => {
    // 11 digitos comecando com 55: e DDD 55 + celular, precisa do DDI na frente.
    expect(normalizeBrazilPhone('55999998888')).toBe('5555999998888')
  })

  it('irrecuperavel retorna null', () => {
    expect(normalizeBrazilPhone('9999')).toBeNull()
    expect(normalizeBrazilPhone('')).toBeNull()
    expect(normalizeBrazilPhone(null)).toBeNull()
    expect(normalizeBrazilPhone(undefined)).toBeNull()
    expect(normalizeBrazilPhone('texto sem numero')).toBeNull()
  })
})

describe('buildWaLink', () => {
  it('monta o link com texto URL-encoded (acentos e quebras de linha)', () => {
    const link = buildWaLink('48999998888', 'Olá!\nIpê-amarelo')
    expect(link).toBe('https://wa.me/5548999998888?text=Ol%C3%A1!%0AIp%C3%AA-amarelo')
  })

  it('telefone invalido retorna null', () => {
    expect(buildWaLink('123', 'oi')).toBeNull()
    expect(buildWaLink(null, 'oi')).toBeNull()
  })
})

describe('buildQuoteRequestMessage', () => {
  const base = {
    supplierName: 'Viveiro do Vale',
    senderName: 'Joao',
    items: [
      { speciesName: 'Ipê-amarelo', quantity: 500, size: '30-50cm' },
      { speciesName: 'Araucária', quantity: 200 },
    ],
  }

  it('saude pelo contato quando informado, senao pelo nome do viveiro', () => {
    expect(buildQuoteRequestMessage({ ...base, contactName: 'Maria' })).toContain('Olá, Maria!')
    expect(buildQuoteRequestMessage(base)).toContain('Olá, Viveiro do Vale!')
  })

  it('identifica o remetente e o viveiro (mensagem honesta)', () => {
    const msg = buildQuoteRequestMessage(base)
    expect(msg).toContain('Aqui é Joao, do Viveiro Mudar')
    expect(msg).toContain('rede de viveiros parceiros')
  })

  it('lista os itens com quantidade e tamanho quando houver', () => {
    const msg = buildQuoteRequestMessage(base)
    expect(msg).toContain('• 500x Ipê-amarelo (30-50cm)')
    expect(msg).toContain('• 200x Araucária')
    expect(msg).not.toContain('Araucária (')
  })

  it('pede preco, tamanho e disponibilidade', () => {
    expect(buildQuoteRequestMessage(base)).toMatch(/preço, tamanho e disponibilidade/)
  })

  it('observacao extra entra no final quando informada', () => {
    const msg = buildQuoteRequestMessage({ ...base, extraNote: 'Entrega em Ituporanga.' })
    expect(msg).toContain('Entrega em Ituporanga.')
  })
})
