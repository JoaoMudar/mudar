'use client'

import { useState, type ReactNode } from 'react'

export interface ColunaTabela {
  chave: string
  rotulo: string
  /** Alinhar a direita e usar tabular-nums (colunas de numero). */
  numerica?: boolean
}

interface Props {
  titulo: string
  /** Uma linha explicando o que o grafico responde. Nao repetir o titulo. */
  subtitulo?: string
  /** Aviso contextual (periodo parcial, fonte do dado, limitacao conhecida). */
  aviso?: ReactNode
  children: ReactNode
  /** Dados da visao de tabela. Sem isto o botao "ver tabela" nao aparece. */
  tabela?: { colunas: ColunaTabela[]; linhas: Record<string, ReactNode>[] }
  className?: string
}

/**
 * Moldura padrao de todo grafico do BI.
 *
 * A visao de tabela nao e enfeite: tres cores da paleta ficam abaixo de 3:1 no
 * branco dos cards, e a regra do skill dataviz e que contraste baixo obriga
 * rotulo visivel OU tabela. Alem disso serve de par acessivel do grafico —
 * tooltip nunca pode ser o unico caminho ate o valor.
 */
export default function ChartCard({
  titulo, subtitulo, aviso, children, tabela, className = '',
}: Props) {
  const [verTabela, setVerTabela] = useState(false)

  return (
    <section className={`bg-white rounded-xl shadow-sm border border-gray-100 p-3 ${className}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-gray-800 leading-tight">{titulo}</h2>
          {subtitulo && <p className="text-xs text-gray-500 mt-0.5">{subtitulo}</p>}
        </div>
        {tabela && tabela.linhas.length > 0 && (
          <button
            type="button"
            onClick={() => setVerTabela((v) => !v)}
            className="text-xs text-green-700 hover:text-green-900 font-semibold whitespace-nowrap shrink-0 px-2 py-1 -mr-1 -mt-1"
            aria-expanded={verTabela}
          >
            {verTabela ? 'ver gráfico' : 'ver tabela'}
          </button>
        )}
      </div>

      {aviso && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mb-2">
          {aviso}
        </p>
      )}

      {verTabela && tabela ? (
        // overflow-x proprio: tabela larga nao pode fazer a pagina rolar de lado.
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                {tabela.colunas.map((c) => (
                  <th
                    key={c.chave}
                    className={`py-1.5 px-1 font-semibold text-gray-600 ${
                      c.numerica ? 'text-right' : 'text-left'
                    }`}
                  >
                    {c.rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabela.linhas.map((l, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  {tabela.colunas.map((c) => (
                    <td
                      key={c.chave}
                      className={`py-1.5 px-1 text-gray-700 ${
                        c.numerica ? 'text-right tabular-nums' : 'text-left'
                      }`}
                    >
                      {l[c.chave]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  )
}
