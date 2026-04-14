# P8 — Instagram / Presença Digital

## Status: NÃO INICIADO
## Prioridade: MÉDIA
## Dependências: Nenhuma técnica (P7 ajuda com link do catálogo quando pronto)
## Bloqueia: Nenhum

---

## Objetivo
Criar presença digital no Instagram que posicione o Viveiro Mudar como referência em mudas nativas na região, atraia clientes novos organicamente e gere leads qualificados para o WhatsApp.

## Contexto
Zero presença digital. Clientes vêm 100% por indicação. Instagram é o canal #1 para viveiros de mudas — paisagistas, engenheiros florestais e prefeituras buscam fornecedores lá. Gilberto tem conhecimento técnico valioso que gera conteúdo naturalmente. É o projeto com menor custo e pode começar amanhã.

## Resultado Esperado
- Perfil profissional no Instagram com identidade visual consistente
- Calendário de conteúdo com 3-4 posts por semana
- Reels do Gilberto explicando espécies (autoridade técnica)
- Link-in-bio com catálogo + WhatsApp
- Crescimento orgânico de seguidores qualificados

---

## Tarefas de Campo (NÃO dependem de código)

### Setup Inicial
- [ ] Criar conta Instagram Business: @viveiromudar
- [ ] Bio: "Mudas nativas do Alto Vale do Itajaí 🌱 | Atacado e projetos | Mais de [X] espécies | Entrega em SC" + link
- [ ] Foto de perfil: logo ou foto marcante do viveiro
- [ ] Configurar Instagram Business (vincular à página do Facebook)
- [ ] Ativar botão de contato WhatsApp no perfil

### Identidade Visual (dev task abaixo)
- [ ] Definir paleta de cores: verde escuro, terra, branco, toque de dourado/âmbar
- [ ] Escolher 2 fontes: uma para títulos (display), uma para texto
- [ ] Aplicar consistência em todos os posts

### Pilares de Conteúdo
- [ ] **Pilar 1 — Educativo (40%)**: Gilberto explica espécies, dicas de plantio, curiosidades botânicas
  - Formato: Reels de 30-60s, carrosséis informativos
  - Ex: "Você sabia que o Ipê-Amarelo demora 5 anos para florir?"
- [ ] **Pilar 2 — Bastidores (30%)**: rotina do viveiro, processo de produção, equipe
  - Formato: Stories diários, Reels do dia a dia
  - Ex: "Um dia no viveiro — da semente à muda"
- [ ] **Pilar 3 — Resultados (20%)**: projetos entregues, antes/depois de reflorestamento
  - Formato: Carrossel com fotos, Reels de entrega
  - Ex: "2.000 mudas entregues para restauração no Vale do Itajaí"
- [ ] **Pilar 4 — Comercial (10%)**: promoções, espécies disponíveis, novidades
  - Formato: Post simples, Story com link
  - Ex: "Nova remessa de Palmito Juçara disponível — lotes limitados"

### Rotina de Conteúdo
- [ ] Definir dia fixo de gravação (ex: quarta-feira, 1-2h)
- [ ] Gravar 4-6 Reels de uma vez (Gilberto no campo)
- [ ] Usar CapCut ou InShot para edição rápida
- [ ] Postar: seg/qua/sex + stories diários
- [ ] Responder todos os comentários e DMs em 24h
- [ ] Salvar templates de respostas para DMs frequentes

### Conteúdo Inicial (primeiros 12 posts)
- [ ] Post 1: Apresentação do viveiro (carrossel com fotos)
- [ ] Post 2: Reel Gilberto — "Por que plantar nativas?"
- [ ] Post 3: Carrossel — "5 espécies ideais para restauração"
- [ ] Post 4: Bastidores — processo de produção de substrato
- [ ] Post 5: Reel — "Conheça o Ipê-Amarelo" (ficha da espécie)
- [ ] Post 6: Antes/depois de um projeto entregue
- [ ] Post 7: Reel Gilberto — "Diferença entre pioneira e clímax"
- [ ] Post 8: Story highlight — "Como comprar" (passo a passo)
- [ ] Post 9: Carrossel — "Espécies frutíferas disponíveis"
- [ ] Post 10: Bastidores — equipe no campo
- [ ] Post 11: Reel — tour pelo viveiro
- [ ] Post 12: Post comercial — "Fazemos entrega em todo o estado"

---

## Tarefas de Desenvolvimento (mínimas)

- [ ] **T8.1** Criar identidade visual básica:
  - Logo vetorizado (se não existir) — SVG + PNG
  - Paleta de cores definida como design tokens
  - 2 fontes definidas (Google Fonts para uso digital)
- [ ] **T8.2** Criar 4 templates de post no Canva (ou Figma):
  - Template carrossel educativo
  - Template post comercial
  - Template bastidores
  - Template ficha de espécie
- [ ] **T8.3** Configurar link-in-bio (página simples):
  - Opção A: Linktree gratuito
  - Opção B: Página própria `/links` no site (quando P9 existir)
  - Links: WhatsApp, Catálogo (quando P7 existir), Localização, "Solicitar Orçamento"
- [ ] **T8.4** Criar script/automação para gerar ficha de espécie como imagem:
  - Input: dados da espécie do banco
  - Output: imagem 1080x1080 formatada para Instagram
  - Usar Puppeteer ou sharp para gerar a imagem do template HTML

---

## Critérios de Aceite
- [ ] Perfil criado com bio, foto e botão de contato
- [ ] Identidade visual definida e aplicada
- [ ] 12 posts publicados no primeiro mês
- [ ] Templates reutilizáveis criados
- [ ] Link-in-bio funcionando com WhatsApp e catálogo
- [ ] Rotina de conteúdo definida e documentada

---

## Notas Técnicas
- Instagram é 95% campo e 5% dev. A maior parte é execução da equipe.
- O gerador automático de fichas (T8.4) é opcional mas muito útil — publica uma espécie nova por semana sem esforço.
- Quando P7 (catálogo) estiver pronto, mudar link-in-bio para apontar para o catálogo.
- Hashtags recomendadas: #mudasnativas #reflorestamento #restauraçãoambiental #viveiro #plantararvores #mudasflorestais #altovaledoitajai #santacatarina
- Não investir em ads até ter pelo menos 30 posts e fluxo de conteúdo rodando.
