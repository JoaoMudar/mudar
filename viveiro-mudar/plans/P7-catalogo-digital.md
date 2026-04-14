# P7 — Catálogo Digital de Espécies

## Status: NÃO INICIADO
## Prioridade: MÉDIA
## Dependências: P1 (espécies), P3 (preços), P2 (estoque via lotes)
## Bloqueia: P9 (Site — catálogo embutido), P10 (E-commerce — vitrine)

---

## Objetivo
Criar catálogo online público das espécies disponíveis com fotos, descrições técnicas, disponibilidade em tempo real e botão de orçamento via WhatsApp. Profissionalizar a venda e permitir que o cliente veja o que tem sem precisar ligar.

## Contexto
Clientes ligam ou mandam WhatsApp perguntando "vocês têm ipê amarelo?" — Gilberto responde de cabeça. Não existe catálogo impresso nem digital. Paisagistas e engenheiros florestais querem ver ficha técnica antes de comprar. Um catálogo online é ferramenta de venda passiva 24h.

## Resultado Esperado
- Página web pública com todas as espécies
- Busca e filtros por nome, categoria, bioma, recipiente
- Ficha técnica de cada espécie com foto e dados
- Indicador de disponibilidade em tempo real (em estoque / sob encomenda)
- Botão "Solicitar Orçamento" que abre WhatsApp com espécies pré-selecionadas

---

## Dados que a Equipe de Campo Precisa Levantar (PARALELO)

- [ ] **Fotos de espécies**: João fotografar cada espécie — muda jovem, luz natural, fundo limpo (celular bom basta)
- [ ] **Descrições técnicas**: Gilberto escrever para cada espécie — uso, porte adulto, bioma, velocidade de crescimento, tipo (pioneira/secundária/clímax)
- [ ] **Classificação por categoria**: frutífera, ornamental, madeira, restauração, outros (Gilberto)
- [ ] **Informações adicionais**: época de coleta de sementes, regiões onde ocorre naturalmente, dicas de plantio (Gilberto)

---

## Tarefas de Desenvolvimento

### Fase 1: Preparação de Dados

- [ ] **T7.1** Adicionar campos à tabela `species` (se não existirem do P1):
  ```
  description_short, description_long, adult_height_m, biome,
  growth_speed (enum: lenta, média, rápida), succession_group (enum: pioneira, secundária_inicial, secundária_tardia, clímax),
  uses (text[] — restauração, paisagismo, frutífera, madeira, mel, sombra),
  seed_collection_months (int[] — ex: [3,4,5] para mar-mai),
  planting_tips, is_published (boolean default false)
  ```
- [ ] **T7.2** Configurar Supabase Storage bucket `species-photos` (público)
- [ ] **T7.3** Criar script para upload em massa de fotos e vincular às espécies

### Fase 2: Catálogo Público

- [ ] **T7.4** Criar página pública `/catalogo`
  - Grid de cards com: foto, nome popular, nome científico, categoria, badge de disponibilidade
  - Busca por nome (popular ou científico) com debounce
  - Filtros: categoria, bioma, velocidade de crescimento, grupo sucessional
  - Ordenação: nome A-Z, disponibilidade, popularidade
  - Lazy loading / infinite scroll
  - SEO otimizado (meta tags por espécie para Google)
- [ ] **T7.5** Criar página `/catalogo/[slug]` (ficha da espécie)
  - Foto grande com galeria se houver múltiplas
  - Nome popular + científico
  - Descrição curta + longa
  - Dados técnicos: porte, bioma, crescimento, grupo sucessional
  - Usos (tags)
  - Recipientes disponíveis com preço de referência
  - Disponibilidade em tempo real (query em `batches` status = 'pronto')
  - Botão "Solicitar Orçamento" → abre wa.me com texto: "Olá, gostaria de orçamento para [espécie] ([recipiente])"
  - Espécies relacionadas (mesma categoria)
- [ ] **T7.6** Implementar "Carrinho de Interesse":
  - Botão "Adicionar à lista" em cada espécie
  - Lista flutuante no canto da tela (badge com contagem)
  - Ao clicar "Solicitar Orçamento da Lista" → abre WhatsApp com todas as espécies selecionadas
  - Armazenar lista em localStorage (sem necessidade de login)
- [ ] **T7.7** Criar sitemap.xml dinâmico para indexação no Google
- [ ] **T7.8** Implementar página 404 com sugestão de espécies populares

### Fase 3: Admin do Catálogo

- [ ] **T7.9** Adicionar toggle "Publicar no Catálogo" na tela de admin de espécies (P1 T1.13)
- [ ] **T7.10** Adicionar preview do card e da ficha antes de publicar
- [ ] **T7.11** Adicionar editor de descrição longa com markdown simples

---

## Critérios de Aceite
- [ ] Catálogo carrega em menos de 2 segundos
- [ ] Busca encontra espécie por nome popular ou científico
- [ ] Ficha mostra disponibilidade real (atualizada a cada 15 minutos)
- [ ] Botão WhatsApp abre conversa com espécies pré-selecionadas
- [ ] Funciona perfeitamente no celular
- [ ] Pelo menos 20 espécies publicadas com foto e descrição
- [ ] Páginas indexáveis pelo Google (SEO)

---

## Notas Técnicas
- Catálogo é público (sem auth) — dados sensíveis (custo, margem) nunca expostos.
- Usar ISR (Incremental Static Regeneration) do Next.js para performance + dados atualizados.
- Fotos: otimizar com sharp ou next/image — servir webp, max 800px largura.
- O "carrinho de interesse" não é carrinho de compra — é lista para facilitar o orçamento. E-commerce vem no P10.
- URL amigável: `/catalogo/ipe-amarelo` (slug gerado do nome popular).
