import { describe, it, expect } from 'vitest'
import {
  validateOrderItems,
  validateGenericAssignment,
  validateLoadsSplit,
  sumQuantities,
  ORDER_STATUS_META,
  SALE_CHANNEL_LABEL,
  type OrderItemInput,
  type SpeciesAssignment,
} from '../orders'

describe('validateOrderItems', () => {
  const specific: OrderItemInput = {
    species_id: 's1',
    container_id: 'c1',
    quantity: 10,
    is_generic: false,
  }
  const generic: OrderItemInput = {
    species_id: null,
    container_id: 'c1',
    quantity: 500,
    is_generic: true,
  }

  it('aceita itens validos (especifico e generico)', () => {
    expect(validateOrderItems([specific, generic])).toBeNull()
  })

  it('rejeita lista vazia', () => {
    expect(validateOrderItems([])).toMatch(/pelo menos um item/i)
  })

  it('rejeita quantidade zero ou negativa', () => {
    expect(validateOrderItems([{ ...specific, quantity: 0 }])).toMatch(/maior que zero/i)
    expect(validateOrderItems([{ ...specific, quantity: -5 }])).toMatch(/maior que zero/i)
  })

  it('rejeita item sem recipiente', () => {
    expect(validateOrderItems([{ ...specific, container_id: '' }])).toMatch(/recipiente/i)
  })

  it('rejeita item especifico sem especie', () => {
    expect(validateOrderItems([{ ...specific, species_id: null }])).toMatch(/espécie/i)
  })

  it('rejeita item generico com especie', () => {
    expect(validateOrderItems([{ ...generic, species_id: 's1' }])).toMatch(/genérico/i)
  })
})

describe('sumQuantities', () => {
  it('soma quantidades', () => {
    expect(sumQuantities([{ quantity: 100 }, { quantity: 200 }, { quantity: 50 }])).toBe(350)
  })
  it('retorna 0 para lista vazia', () => {
    expect(sumQuantities([])).toBe(0)
  })
})

describe('validateGenericAssignment', () => {
  const volumes: Record<string, number | null> = { c1: 1, c2: 2, c3: 0.5 }
  const base: SpeciesAssignment[] = [
    { species_id: 's1', container_id: 'c1', quantity: 300 },
    { species_id: 's2', container_id: 'c2', quantity: 200 },
  ]

  it('aceita quando a soma bate e recipientes respeitam o minimo', () => {
    expect(validateGenericAssignment(500, 1, base, volumes)).toBeNull()
  })

  it('rejeita quando a soma nao bate', () => {
    expect(validateGenericAssignment(600, 1, base, volumes)).toMatch(/soma/i)
  })

  it('rejeita recipiente menor que o minimo', () => {
    const assign = [{ species_id: 's1', container_id: 'c3', quantity: 500 }]
    expect(validateGenericAssignment(500, 1, assign, volumes)).toMatch(/menor que o mínimo/i)
  })

  it('rejeita lista vazia de atribuicoes', () => {
    expect(validateGenericAssignment(500, 1, [], volumes)).toMatch(/pelo menos uma espécie/i)
  })

  it('rejeita quantidade invalida', () => {
    const assign = [{ species_id: 's1', container_id: 'c1', quantity: 0 }]
    expect(validateGenericAssignment(500, 1, assign, volumes)).toMatch(/maior que zero/i)
  })
})

describe('validateLoadsSplit', () => {
  it('aceita quando a soma por item bate com o total', () => {
    const original = { i1: 500, i2: 200 }
    const loads = [
      { items: [{ order_item_id: 'i1', quantity: 300 }, { order_item_id: 'i2', quantity: 200 }] },
      { items: [{ order_item_id: 'i1', quantity: 200 }] },
    ]
    expect(validateLoadsSplit(original, loads)).toBeNull()
  })

  it('rejeita quando a soma de um item nao bate', () => {
    const original = { i1: 500 }
    const loads = [{ items: [{ order_item_id: 'i1', quantity: 300 }] }]
    expect(validateLoadsSplit(original, loads)).toMatch(/não bate/i)
  })

  it('rejeita quantidade negativa', () => {
    const original = { i1: 500 }
    const loads = [{ items: [{ order_item_id: 'i1', quantity: -1 }] }]
    expect(validateLoadsSplit(original, loads)).toMatch(/negativa/i)
  })
})

describe('metadados', () => {
  it('todos os status tem rotulo e badge', () => {
    for (const meta of Object.values(ORDER_STATUS_META)) {
      expect(meta.label).toBeTruthy()
      expect(meta.badge).toContain('bg-')
    }
  })
  it('todos os canais tem rotulo', () => {
    expect(SALE_CHANNEL_LABEL.atacado).toBe('Atacado')
    expect(SALE_CHANNEL_LABEL.compensacao_ambiental).toBe('Compensação Ambiental')
  })
})
