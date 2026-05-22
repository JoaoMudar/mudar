import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '../middleware'

function createRequest(path: string, options?: { sessionToken?: string }) {
  const url = `http://localhost:3000${path}`
  const req = new NextRequest(url)
  if (options?.sessionToken) {
    req.cookies.set('session_token', options.sessionToken)
  }
  return req
}

describe('middleware', () => {
  describe('rotas publicas', () => {
    it('permite acesso a /login sem cookie', () => {
      const res = middleware(createRequest('/login'))
      expect(res.status).toBe(200)
    })

    it('permite acesso a /_next/static sem cookie', () => {
      const res = middleware(createRequest('/_next/static/chunk.js'))
      expect(res.status).toBe(200)
    })

    it('permite acesso a /icons sem cookie', () => {
      const res = middleware(createRequest('/icons/icon-192.png'))
      expect(res.status).toBe(200)
    })

    it('permite acesso a /sw.js sem cookie', () => {
      const res = middleware(createRequest('/sw.js'))
      expect(res.status).toBe(200)
    })

    it('permite acesso a /manifest sem cookie', () => {
      const res = middleware(createRequest('/manifest.json'))
      expect(res.status).toBe(200)
    })

    it('permite acesso a /uploads sem cookie', () => {
      const res = middleware(createRequest('/uploads/especies/foto.jpg'))
      expect(res.status).toBe(200)
    })
  })

  describe('rotas protegidas', () => {
    it('redireciona para /login sem cookie de sessao', () => {
      const res = middleware(createRequest('/'))
      expect(res.status).toBe(307)
      expect(new URL(res.headers.get('location')!).pathname).toBe('/login')
    })

    it('redireciona /admin sem cookie', () => {
      const res = middleware(createRequest('/admin'))
      expect(res.status).toBe(307)
      expect(new URL(res.headers.get('location')!).pathname).toBe('/login')
    })

    it('permite acesso com cookie de sessao valido', () => {
      const res = middleware(createRequest('/', { sessionToken: 'abc123' }))
      expect(res.status).toBe(200)
    })

    it('permite acesso a /admin com cookie de sessao', () => {
      const res = middleware(createRequest('/admin', { sessionToken: 'abc123' }))
      expect(res.status).toBe(200)
    })
  })
})
