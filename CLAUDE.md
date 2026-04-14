# Viveiro Mudar — Ecossistema de Gestão

## Sobre o Projeto
Sistema integrado de gestão para viveiro de mudas nativas no Alto Vale do Itajaí, SC.
Área: ~10.000 m². Equipe: 7 pessoas. Venda atacado via WhatsApp.

## Contexto Crítico
- Empresa opera há anos **sem dados estruturados** — tudo feito de cabeça
- Usuários finais (Gilberto, Débora, funcionários) **não são técnicos** — interfaces devem ser extremamente simples
- **Celular é o dispositivo principal** — tudo precisa ser mobile-first
- Sistema de NF atual é do Sebrae — dados de notas em Excel com campos genéricos
- Não existe controle de lotes, perdas, margem por espécie, estoque estruturado

## Stack Técnica
- **Banco de dados**: PostgreSQL local (via `pg` / node-postgres)
- **Frontend**: Next.js 15 (App Router) com Tailwind CSS
- **Acesso ao banco**: Server Actions com queries SQL diretas (`pool.query`)
- **Mobile**: PWA (Progressive Web App) — funcionar offline é desejável
- **Automação**: n8n (self-hosted)
- **WhatsApp**: Evolution API (self-hosted)
- **Deploy**: VPS ou local
- **Linguagem**: TypeScript em todo o ecossistema
- **Fotos de espécies**: salvas em `public/uploads/especies/`, servidas estaticamente

## Conexão com o Banco
- Variável de ambiente: `DATABASE_URL` (ex: `postgresql://postgres:postgres@localhost:5432/viveiro`)
- Pool singleton em `src/lib/db.ts` — importar como `import pool from '@/lib/db'`
- Nunca usar o pool no lado cliente (browser) — apenas em Server Components e Server Actions

## Estrutura do Banco de Dados (schema central)
O schema é compartilhado entre todos os projetos. Qualquer alteração no banco deve:
1. Ser feita como arquivo `.sql` na pasta `supabase/migrations/` (compatível com psql puro)
2. Manter compatibilidade retroativa
3. Documentar a migração no CHANGELOG

## Arquitetura dos Projetos
Os projetos são interdependentes. A ordem de implementação importa:
```
P1 (Custeio) ──┐
P2 (Perdas)  ──┤──→ P6 (Dashboard) ──→ P7 (Catálogo)
P3 (Preço)   ──┘                         ↓
                                     P9 (Site) → P10 (E-commerce)
P4 (WhatsApp) ← depende de P1+P3
P5 (Automação n8n) ← depende de P4
P8 (Instagram) ← independente (campo)
```

## Convenções de Código
- Arquivos em inglês, comentários podem ser em português
- Componentes React: PascalCase, um componente por arquivo
- Hooks customizados: useNomeDoHook.ts
- Funções utilitárias: camelCase
- Tabelas do banco: snake_case, plural (ex: species, batches, loss_events)
- API routes: kebab-case
- Commits: Conventional Commits em português (ex: `feat(custeio): adiciona cálculo de custo por espécie`)
- Testes: Vitest para unit, Playwright para e2e (apenas fluxos críticos)

## Workflow de Desenvolvimento
1. Ler o plan file do projeto em `plans/P{N}-*.md`
2. Criar branch: `feat/p{n}-nome-curto`
3. Implementar task por task, marcando `[x]` no plan file
4. Rodar testes antes de commitar
5. Commitar com mensagem descritiva
6. Atualizar o plan file com notas se necessário

## Regras de Negócio Importantes
- **Espécie** é a entidade central — tudo gira em torno dela
- **Recipientes** (tubete, saco 10x18, 17x22, 20x26, 28x32, balde) definem o tamanho da muda e impactam custo e preço
- **Canais de venda**: atacado (padrão), compensação ambiental, paisagismo, prefeitura, varejo futuro
- **Frete**: calculado por R$/km, incorporado ao preço final
- **Mortalidade aceitável**: varia por espécie, mas >20% deve gerar alerta
- **Precificação**: custo real + margem por canal, com piso mínimo de segurança

## Formulários de Campo (princípios)
- Máximo 5 campos por tela
- Dropdowns com opções pré-definidas (nunca campo aberto para categorias)
- Botões grandes para dedos sujos de terra
- Funcionar com conexão lenta ou offline (queue de sync)
- Feedback visual imediato (toast de confirmação)
