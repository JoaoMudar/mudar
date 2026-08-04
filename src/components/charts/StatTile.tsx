'use client'

import type { ReactNode } from 'react'
import { formatPct } from '@/lib/format'

interface Props {
  rotulo: string
  /** Ja formatado. Passe "—" quando o valor for suprimido de proposito. */
  valor: ReactNode
  /** Legenda curta: a janela usada, a fonte, o porque do travessao. */
  nota?: string
  /** Variacao % contra o periodo anterior comparavel. */
  variacao?: number | null
  /**
   * Em despesa, subir e ruim — inverte a cor do delta sem inverter o sinal.
   * O numero mostrado continua sendo o real.
   */
  inverterCorVariacao?: boolean
  /** Marca visivel de que o dado do periodo esta incompleto. */
  parcial?: boolean
  destaque?: boolean
}

/**
 * Cartao de KPI.
 *
 * Numero grande usa figuras proporcionais (sem tabular-nums): em tamanho de
 * display os digitos de largura fixa deixam o numero frouxo.
 */
export default function StatTile({
  rotulo, valor, nota, variacao, inverterCorVariacao = false, parcial = false, destaque = false,
}: Props) {
  const temVariacao = variacao != null && Number.isFinite(variacao)
  const subiu = temVariacao && variacao > 0
  const bom = inverterCorVariacao ? !subiu : subiu
  // Cinza quando a variacao e praticamente nula: pintar 0,2% de verde e ruido.
  const neutro = temVariacao && Math.abs(variacao) < 0.05

  return (
    <div
      className={`bg-white rounded-xl border p-3 ${
        destaque ? 'border-green-200 shadow-sm' : 'border-gray-100'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <p className="text-xs text-gray-500 font-medium">{rotulo}</p>
        {parcial && (
          <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
            parcial
          </span>
        )}
      </div>

      <p
        className={`font-bold text-gray-900 leading-tight mt-1 ${
          destaque ? 'text-3xl' : 'text-xl'
        }`}
      >
        {valor}
      </p>

      {temVariacao && (
        // Seta + sinal: a cor nunca carrega o significado sozinha.
        <p
          className={`text-xs font-semibold mt-0.5 ${
            neutro ? 'text-gray-500' : bom ? 'text-green-700' : 'text-red-700'
          }`}
        >
          {subiu ? '↑' : '↓'} {formatPct(Math.abs(variacao))}
        </p>
      )}

      {nota && <p className="text-[11px] text-gray-400 mt-1 leading-snug">{nota}</p>}
    </div>
  )
}
