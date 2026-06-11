// Nomes de especies: normalizacao canonica e deteccao de conflito.
// Funcoes puras (sem DB nem React), compartilhadas entre o matching do
// "colar lista" (order-paste.ts), as server actions de especies e a UI.
//
// Regra de negocio: um nome popular pertence a UMA unica especie. A garantia
// hard fica no UNIQUE de species_popular_names.name_normalized; estas funcoes
// fazem a checagem amigavel no app cobrindo as duas fontes de nomes
// (species.common_name + species_popular_names).

import { normalizeText } from './text'

/**
 * Forma canonica de um nome para comparacao/unicidade: sem acento, minusculo,
 * hifen/underscore/barra viram espaco, espacos colapsados.
 * Ex: "Ipê-Amarelo" -> "ipe amarelo". E o valor gravado em name_normalized.
 */
export function normalizePopularName(s: string): string {
  return normalizeText(s).replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Um nome ja conhecido no sistema (principal ou sinonimo) e a especie dona. */
export interface KnownName {
  speciesId: string
  /** O nome em si, como cadastrado. */
  name: string
  /** Nome popular principal da especie dona (para mensagens de erro/aviso). */
  speciesLabel: string
}

/**
 * Procura se `candidate` ja pertence a alguma especie (comparacao normalizada).
 * `excludeSpeciesId` ignora a propria especie (caso de update/adicionar sinonimo
 * que repete o proprio nome principal nao e conflito com OUTRA especie — mas
 * sem exclude, repetir o proprio nome tambem e reportado).
 * Retorna o nome conflitante ou null se o candidato esta livre.
 */
export function findNameConflict(
  candidate: string,
  known: KnownName[],
  excludeSpeciesId?: string,
): KnownName | null {
  const target = normalizePopularName(candidate)
  if (!target) return null
  for (const k of known) {
    if (excludeSpeciesId && k.speciesId === excludeSpeciesId) continue
    if (normalizePopularName(k.name) === target) return k
  }
  return null
}
