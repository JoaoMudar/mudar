import { NextResponse } from 'next/server'
import pool from '@/lib/db'

// Serve a foto de especie guardada em `species_photos` (BYTEA).
//
// Publica de proposito: foto de muda nao e dado sensivel, e as telas que a
// exibem sao Server Components — exigir sessao aqui obrigaria a proxiar a
// imagem. O middleware ja exclui /api do matcher, entao nao ha guarda a remover.
//
// O id e um UUID novo a cada upload (trocar a foto gera outra linha e outra
// URL), entao a resposta e imutavel e pode ser cacheada para sempre: nao existe
// o caso "mesma URL, conteudo diferente".
const ONE_YEAR = 60 * 60 * 24 * 365

// Aceita apenas UUID. Sem isso, qualquer texto vira parametro de query — e
// mesmo com query parametrizada, gera erro 22P02 do Postgres a cada requisicao
// de crawler, que iria parar no Sentry como se fosse defeito.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const { rows } = await pool.query(
    `SELECT bytes, mime FROM species_photos WHERE id = $1`,
    [id],
  )
  if (rows.length === 0) {
    return new NextResponse('Not found', { status: 404 })
  }

  const bytes: Buffer = rows[0].bytes
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': rows[0].mime,
      'Content-Length': String(bytes.length),
      'Cache-Control': `public, max-age=${ONE_YEAR}, immutable`,
    },
  })
}
