import { describe, it, expect } from 'vitest'
import { validatePassword, MAX_PASSWORD_LENGTH } from '../password-policy'

describe('validatePassword', () => {
  it('aceita uma senha boa de 8+ caracteres', () => {
    expect(validatePassword('girassol-azul')).toBeNull()
    expect(validatePassword('12ab9zkq')).toBeNull() // exatamente 8, fora da blocklist
  })

  it('rejeita com menos de 8 caracteres', () => {
    expect(validatePassword('curta1')).toMatch(/mínimo/i)
    expect(validatePassword('1234567')).toMatch(/mínimo/i)
  })

  it('rejeita acima do teto (DoS no scrypt)', () => {
    expect(validatePassword('a'.repeat(MAX_PASSWORD_LENGTH + 1))).toMatch(/máximo/i)
  })

  it('rejeita senhas comuns, ignorando maiúsculas/minúsculas', () => {
    expect(validatePassword('password')).not.toBeNull()
    expect(validatePassword('PASSWORD')).not.toBeNull()
    expect(validatePassword('12345678')).not.toBeNull()
    expect(validatePassword('qwertyui')).not.toBeNull()
  })

  it('rejeita raízes óbvias do domínio mesmo com dígitos no fim', () => {
    expect(validatePassword('viveiro2024')).not.toBeNull()
    expect(validatePassword('senha123')).not.toBeNull()
    expect(validatePassword('mudar01')).not.toBeNull()
    expect(validatePassword('ADMIN99')).not.toBeNull()
  })

  it('rejeita valores não-string', () => {
    expect(validatePassword(undefined)).not.toBeNull()
    expect(validatePassword(12345678)).not.toBeNull()
  })
})
