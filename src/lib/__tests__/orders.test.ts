import { describe, it, expect } from 'vitest'
import {
  validateOrderItems,
  validateGenericAssignment,
  validateLoadsSplit,
  resolveAvailability,
  buildAvailabilityNote,
  describeContainerChange,
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
  const base: SpeciesAssignment[] = [
    { species_id: 's1', container_id: 'c1', quantity: 300 },
    { species_id: 's2', container_id: 'c2', quantity: 200 },
  ]

  it('aceita quando a soma bate', () => {
    expect(validateGenericAssignment(500, base)).toBeNull()
  })

  it('rejeita quando a soma nao bate', () => {
    expect(validateGenericAssignment(600, base)).toMatch(/soma/i)
  })

  it('aceita recipiente diferente do minimo (troca permitida, so destacada)', () => {
    const assign = [{ species_id: 's1', container_id: 'c3', quantity: 500 }]
    expect(validateGenericAssignment(500, assign)).toBeNull()
  })

  it('rejeita lista vazia de atribuicoes', () => {
    expect(validateGenericAssignment(500, [])).toMatch(/pelo menos uma espécie/i)
  })

  it('rejeita quantidade invalida', () => {
    const assign = [{ species_id: 's1', container_id: 'c1', quantity: 0 }]
    expect(validateGenericAssignment(500, assign)).toMatch(/maior que zero/i)
  })

  it('rejeita linha sem recipiente', () => {
    const assign = [{ species_id: 's1', container_id: '', quantity: 500 }]
    expect(validateGenericAssignment(500, assign)).toMatch(/recipiente/i)
  })

  it('sem escopo (lista vazia/undefined) mantem comportamento atual', () => {
    expect(validateGenericAssignment(500, base, [])).toBeNull()
    expect(validateGenericAssignment(500, base, undefined)).toBeNull()
  })

  it('aceita atribuicao dentro do escopo', () => {
    expect(validateGenericAssignment(500, base, ['s1', 's2', 's3'])).toBeNull()
  })

  it('rejeita especie fora do escopo do pedido', () => {
    expect(validateGenericAssignment(500, base, ['s1'])).toMatch(/fora do escopo/i)
  })
})

describe('resolveAvailability', () => {
  it('disponivel => is_available true, sem parcial', () => {
    const { resolved, error } = resolveAvailability('disponivel', 25)
    expect(error).toBeUndefined()
    expect(resolved).toEqual({ is_available: true, available_quantity: null, available_container_id: null })
  })

  it('indisponivel => is_available false, quantidade 0', () => {
    const { resolved } = resolveAvailability('indisponivel', 25)
    expect(resolved).toEqual({ is_available: false, available_quantity: 0, available_container_id: null })
  })

  it('parcial valido => is_available false com qtd e recipiente', () => {
    const { resolved, error } = resolveAvailability('parcial', 25, {
      availableQuantity: 15,
      availableContainerId: 'c2',
    })
    expect(error).toBeUndefined()
    expect(resolved).toEqual({ is_available: false, available_quantity: 15, available_container_id: 'c2' })
  })

  it('parcial rejeita quantidade >= total', () => {
    const { error } = resolveAvailability('parcial', 25, { availableQuantity: 25, availableContainerId: 'c2' })
    expect(error).toMatch(/menor que o total/i)
  })

  it('parcial rejeita quantidade <= 0', () => {
    const { error } = resolveAvailability('parcial', 25, { availableQuantity: 0, availableContainerId: 'c2' })
    expect(error).toMatch(/quantidade/i)
  })

  it('parcial exige recipiente', () => {
    const { error } = resolveAvailability('parcial', 25, { availableQuantity: 15 })
    expect(error).toMatch(/recipiente/i)
  })
})

describe('buildAvailabilityNote', () => {
  it('gera nota com recipiente quando difere', () => {
    const note = buildAvailabilityNote({
      requestedQuantity: 25,
      requestedContainerName: '27x22',
      isAvailable: false,
      availableQuantity: 15,
      availableContainerName: '12x18',
    })
    expect(note).toBe('Pediu 25un 27x22 — disponível 15un 12x18')
  })

  it('omite recipiente quando igual ao pedido', () => {
    const note = buildAvailabilityNote({
      requestedQuantity: 25,
      requestedContainerName: '27x22',
      isAvailable: false,
      availableQuantity: 15,
      availableContainerName: '27x22',
    })
    expect(note).toBe('Pediu 25un 27x22 — disponível 15un')
  })

  it('retorna null quando disponivel ou nao verificado', () => {
    expect(
      buildAvailabilityNote({
        requestedQuantity: 25,
        requestedContainerName: '27x22',
        isAvailable: true,
        availableQuantity: null,
        availableContainerName: null,
      }),
    ).toBeNull()
    expect(
      buildAvailabilityNote({
        requestedQuantity: 25,
        requestedContainerName: '27x22',
        isAvailable: null,
        availableQuantity: null,
        availableContainerName: null,
      }),
    ).toBeNull()
  })

  it('retorna null para indisponivel total (qtd 0)', () => {
    expect(
      buildAvailabilityNote({
        requestedQuantity: 25,
        requestedContainerName: '27x22',
        isAvailable: false,
        availableQuantity: 0,
        availableContainerName: null,
      }),
    ).toBeNull()
  })
})

describe('describeContainerChange', () => {
  it('descreve troca quando recipientes diferem', () => {
    expect(describeContainerChange('12x18', '10x18')).toBe('10x18 → 12x18')
  })
  it('retorna null quando igual', () => {
    expect(describeContainerChange('10x18', '10x18')).toBeNull()
  })
  it('retorna null quando algum nome falta', () => {
    expect(describeContainerChange(null, '10x18')).toBeNull()
    expect(describeContainerChange('10x18', null)).toBeNull()
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
