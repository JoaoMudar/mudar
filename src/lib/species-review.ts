/**
 * Heuristica de "cadastro incompleto" de especie e busca de apoio no Google.
 *
 * Cadastros rapidos (createSpeciesQuick) salvam so o nome popular — sem nome
 * cientifico nem caracteristicas. A tela de Especies usa isSpeciesIncomplete
 * para oferecer a rotina "Revisar cadastros incompletos", e googleSearchUrl
 * para montar uma busca pronta que ajuda o usuario a preencher os dados.
 */

interface SpeciesIncompleteInput {
  scientific_name?: string | null
  tags?: string[] | null
}

/**
 * Especie e considerada incompleta quando nao tem nome cientifico E nao tem
 * nenhuma caracteristica (tag). Tolerante a null/undefined/strings em branco.
 */
export function isSpeciesIncomplete(s: SpeciesIncompleteInput): boolean {
  const hasScientificName = (s.scientific_name ?? '').trim().length > 0
  const hasTags = (s.tags ?? []).length > 0
  return !hasScientificName && !hasTags
}

/**
 * URL de busca no Google ja montada para o usuario se informar antes de
 * completar o cadastro. Ex: "Planta Cambuca nome cientifico categoria".
 */
export function googleSearchUrl(commonName: string): string {
  const query = `Planta ${commonName.trim()} nome científico categoria`
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}
