# P9 — Site Institucional

## Status: NÃO INICIADO
## Prioridade: MÉDIA
## Dependências: P7 (catálogo — será embutido no site), P8 (identidade visual)
## Bloqueia: P10 (E-commerce — loja no site)

---

## Objetivo
Criar site profissional que dê credibilidade para licitações, compensação ambiental e clientes corporativos. Funcionar como hub: institucional + catálogo + contato + futuramente e-commerce.

## Contexto
Sem site, o viveiro depende 100% de indicação. Prefeituras e construtoras pesquisam no Google antes de contratar. Concorrentes com site simples levam vantagem. O domínio viveiromudar.com.br (ou similar) é o endereço digital permanente do negócio.

## Resultado Esperado
- Site responsivo com páginas: Home, Sobre, Catálogo (P7), Serviços, Contato
- SEO otimizado para aparecer no Google em buscas como "mudas nativas SC"
- Google Business Profile configurado
- Formulário de contato + botão WhatsApp
- Performance excelente (Lighthouse > 90)

---

## Dados que a Equipe de Campo Precisa Levantar (PARALELO)

- [ ] **Textos institucionais**: João + Gilberto escreverem rascunhos sobre a empresa — história, missão, diferenciais, área de atuação (pode ser tosco, eu refino)
- [ ] **Fotos profissionais**: João selecionar 10-15 melhores fotos do viveiro, equipe, mudas, entregas
- [ ] **Depoimentos de clientes**: Gilberto pedir por WhatsApp — prints ou texto escrito (pelo menos 3)
- [ ] **Registro de domínio**: João registrar viveiromudar.com.br no Registro.br (~R$40/ano)
- [ ] **Google Business Profile**: João criar/atualizar perfil com endereço, horário, fotos, categoria "Viveiro de plantas"
- [ ] **Listar serviços oferecidos**: produção de mudas nativas, fornecimento para compensação ambiental, projetos de restauração, paisagismo nativo, consultoria em espécies (Gilberto)

---

## Tarefas de Desenvolvimento

### Fase 1: Estrutura e Setup

- [ ] **T9.1** Criar projeto Next.js (App Router) — pode ser o mesmo projeto do dashboard ou separado
  - Se mesmo projeto: rotas públicas `/` e rotas autenticadas `/app`
  - Se separado: deploy independente
  - Decisão recomendada: mesmo projeto, domínio único
- [ ] **T9.2** Configurar domínio no Vercel (viveiromudar.com.br)
- [ ] **T9.3** Configurar metadados globais (SEO):
  - Title template: "Viveiro Mudar | Mudas Nativas do Alto Vale do Itajaí"
  - Meta description
  - Open Graph images
  - Favicon e app icons

### Fase 2: Páginas

- [ ] **T9.4** Criar página Home (`/`)
  - Hero com foto impactante do viveiro + headline + CTA "Ver Catálogo" / "Solicitar Orçamento"
  - Seção: números do viveiro (X espécies, Y mudas/ano, Z anos de experiência)
  - Seção: espécies em destaque (6 cards do catálogo P7)
  - Seção: depoimentos de clientes (carrossel)
  - Seção: área de atuação / mapa de entregas
  - Footer: contato, endereço, redes sociais, horário
- [ ] **T9.5** Criar página Sobre (`/sobre`)
  - História do viveiro
  - Equipe (foto + nome + função)
  - Diferenciais (localização, experiência, qualidade)
  - Galeria de fotos
- [ ] **T9.6** Criar página Serviços (`/servicos`)
  - Cards: Mudas para Restauração, Compensação Ambiental, Paisagismo Nativo, Fornecimento para Prefeituras
  - Cada serviço: descrição + CTA
- [ ] **T9.7** Integrar catálogo (P7) na rota `/catalogo` (já implementado)
- [ ] **T9.8** Criar página Contato (`/contato`)
  - Formulário: nome, email, telefone, assunto, mensagem
  - Envio para email do viveiro (Supabase Edge Function + Resend ou similar)
  - Mapa do Google Maps com localização
  - Botão WhatsApp flutuante
  - Informações: endereço, telefone, email, horário
- [ ] **T9.9** Criar página de links (`/links`) — substituir Linktree do P8
  - WhatsApp, Instagram, Catálogo, Contato
  - Design alinhado com identidade visual

### Fase 3: SEO e Performance

- [ ] **T9.10** Implementar SEO técnico:
  - Sitemap.xml dinâmico (inclui páginas + espécies do catálogo)
  - robots.txt
  - Schema.org markup (Organization, LocalBusiness, Product para espécies)
  - Canonical URLs
  - Alt text em todas as imagens
- [ ] **T9.11** Otimizar performance:
  - next/image para todas as imagens (webp, lazy loading, srcset)
  - Font optimization (next/font)
  - Lighthouse score > 90 em todas as categorias
- [ ] **T9.12** Configurar Google Analytics 4
- [ ] **T9.13** Configurar Google Search Console e submeter sitemap
- [ ] **T9.14** Criar página 404 personalizada com sugestão de navegação

### Fase 4: Componentes Reutilizáveis

- [ ] **T9.15** Botão flutuante de WhatsApp (em todas as páginas)
- [ ] **T9.16** Header com navegação responsiva (hamburger menu no mobile)
- [ ] **T9.17** Footer padronizado
- [ ] **T9.18** Componente de depoimentos (carrossel)

---

## Critérios de Aceite
- [ ] Site acessível em viveiromudar.com.br
- [ ] Todas as páginas responsivas e bonitas no celular
- [ ] Lighthouse > 90 em Performance, Accessibility, SEO
- [ ] Formulário de contato envia email
- [ ] WhatsApp acessível de qualquer página
- [ ] Google Business Profile configurado e vinculado
- [ ] Site aparece no Google ao buscar "viveiro mudar" (após indexação)

---

## Notas Técnicas
- Usar mesmo projeto Next.js do ecossistema. Rotas públicas (site) e rotas `/app` (dashboard/gestão).
- Deploy na Vercel (gratuito para o tráfego esperado).
- Fotos são o ativo mais importante — investir tempo em boas fotos do viveiro.
- O site é vitrine, não sistema. Deve ser simples, bonito e rápido.
- Google Business Profile é gratuito e aparece no Maps — muito valioso para buscas locais.
