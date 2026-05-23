# Viveiro Mudar — Ecossistema de Gestão

> 📂 **Mapa de toda a documentação em [`docs/README.md`](docs/README.md)** — comece por aí para se situar.
> Contexto completo (arquitetura dos projetos P1→P10, princípios de formulário de campo,
> histórico do sistema antigo) em `docs/contexto-projeto.md`. Rotinas de negócio em `docs/rotinas/`.

## Projeto
Sistema de gestão para viveiro de mudas nativas (Alto Vale do Itajaí, SC). ~10.000 m², 7 pessoas, venda atacado via WhatsApp.

**Contexto que molda decisões:**
- Usuários (Gilberto, Débora, funcionários) **não são técnicos** → interfaces extremamente simples.
- **Mobile-first** — celular é o dispositivo principal; offline desejável (PWA).
- Empresa operou sempre sem dados estruturados; não há controle de lotes, perdas, margem ou estoque.

## Stack
- **Banco**: PostgreSQL local via `pg` (node-postgres). Pool singleton em `src/lib/db.ts` → `import pool from '@/lib/db'`. Nunca usar no client — só Server Components/Actions.
  - Env: `DATABASE_URL` (ex: `postgresql://postgres:postgres@localhost:5432/viveiro`)
- **Frontend**: Next.js 15 (App Router) + Tailwind. TypeScript em todo o ecossistema.
- **Dados**: Server Actions com SQL direto (`pool.query`).
- **Infra**: PWA mobile, n8n + Evolution API (WhatsApp), deploy VPS/local.
- **Fotos de espécies**: `public/uploads/especies/`, servidas estaticamente.

## Banco de dados (schema compartilhado entre projetos)
Toda alteração no banco: (1) arquivo `.sql` em `migrations/` (psql puro), (2) manter compatibilidade retroativa, (3) documentar no CHANGELOG. Tabelas: snake_case, plural (`species`, `batches`, `loss_events`).

## Convenções de código
- Arquivos/código em inglês; comentários podem ser em português.
- Componentes React PascalCase (1 por arquivo); hooks `useNome.ts`; utils camelCase; rotas API kebab-case.
- Commits: Conventional Commits em português (ex: `feat(custeio): adiciona cálculo de custo`).

## Regras de negócio
- **Espécie** é a entidade central — tudo gira em torno dela.
- **Recipientes** (tubete, sacos 10x18 / 17x22 / 20x26 / 28x32, balde) definem o tamanho da muda → impactam custo e preço.
- **Canais de venda**: atacado (padrão), compensação ambiental, paisagismo, prefeitura, varejo futuro.
- **Preço** = custo real + margem por canal, com piso mínimo de segurança. Frete por R$/km incorporado ao preço.
- **Mortalidade** acima de 20% gera alerta.

## Workflow
1. Ler o plan file em `plans/P{N}-*.md`; implementar task por task marcando `[x]` ao concluir cada uma.
2. Garantir a branch correta (ver abaixo) antes de editar.
3. `npm test` antes de commitar — o pre-commit hook roda lint+testes e bloqueia se falhar.
4. Ao finalizar: resumo com o que foi feito, arquivos alterados, decisões técnicas e pendências.

## Testes obrigatórios
- Toda alteração de código inclui testes. Vitest unit em `__tests__/` ao lado do código (`*.test.ts`).
- Cobrir: utils, lógica de negócio, validações. Server Actions que dependem do DB: mockar imports com `vi.mock`.

## Branch, commit e segurança
- **NUNCA** trabalhe direto em `main`/`master`. Antes de editar: `git branch --show-current`; se estiver em main/master, **pare** e crie `git checkout -b feat/nome-da-tarefa`. (Detalhes em `docs/fluxo-claude-code-git.md`.)
- Sem autorização explícita do usuário, **nunca**: faça merge para main, `git push --force`, `git reset --hard`, delete branches, ou altere `.claude/settings.json`/hooks.
- Nunca commite `.env`, credenciais, tokens ou dumps sensíveis.
