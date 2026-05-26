# Viveiro Mudar — Ecossistema de Gestão

Sistema integrado de gestão para um viveiro de mudas nativas no Alto Vale do Itajaí (SC).
Área de ~10.000 m², equipe de 7 pessoas e venda no atacado via WhatsApp.

O foco é trocar o "tudo de cabeça" por **dados estruturados**, com interfaces extremamente
simples e **mobile-first** — os usuários finais não são técnicos e o celular é o dispositivo
principal de uso no campo.

---

## Stack

| Camada            | Tecnologia                                                        |
| ----------------- | ----------------------------------------------------------------- |
| Frontend          | Next.js 16 (App Router) + React 19 + Tailwind CSS                 |
| Backend           | Server Actions com SQL direto (`pool.query`)                      |
| Banco de dados    | PostgreSQL — **local em dev**, **Neon (cloud) na produção/Vercel**; driver escolhido pelo host |
| Autenticação      | Sessão própria por cookie (scrypt + tokens SHA-256)               |
| Mobile            | PWA (manifest + service worker, fila de sync offline)             |
| Linguagem         | TypeScript                                                        |
| Testes            | Vitest (unitários)                                                |

---

## Como rodar localmente

Pré-requisitos: **Node.js 20+** e um **PostgreSQL local** acessível (ex.: instância do pgAdmin).
Na produção (Vercel) o banco é o **Neon** — basta apontar a `DATABASE_URL` de cada ambiente;
o driver certo é escolhido automaticamente pelo host (`*.neon.tech` → driver serverless).

```bash
# 1. Instalar dependências
npm install

# 2. Configurar a conexão com o banco local (.env.local)
echo 'DATABASE_URL=postgresql://postgres:<senha>@localhost:5432/viveiro' > .env.local

# 3. Rodar as migrações
npm run db:migrate

# 4. Criar o primeiro usuário administrador
npm run db:seed-admin

# 5. Subir o ambiente de desenvolvimento
npm run dev
```

A aplicação fica disponível em `http://localhost:3000`. O login é exigido em todas as rotas
(o middleware redireciona para `/login`).

---

## Scripts

| Comando                     | Descrição                                            |
| --------------------------- | ---------------------------------------------------- |
| `npm run dev`               | Servidor de desenvolvimento                          |
| `npm run build`             | Roda migrações e faz o build de produção             |
| `npm start`                 | Servidor de produção                                 |
| `npm run lint`              | ESLint sobre `src/`                                  |
| `npm test`                  | Testes unitários (Vitest)                            |
| `npm run db:migrate`        | Aplica migrações pendentes                           |
| `npm run db:migrate:status` | Mostra o estado das migrações                        |
| `npm run db:migrate:mark`   | Marca migrações como aplicadas (sem executá-las)     |
| `npm run db:seed-admin`     | Cria o usuário administrador inicial                 |

---

## Estrutura do projeto

```
docs/              Documentação de referência (ver docs/README.md — mapa de tudo)
migrations/        Migrações SQL (psql puro), aplicadas em ordem cronológica
data/seeds/        Fontes de carga inicial (seed), ex.: export das 142 espécies
plans/             Planos de implementação por projeto (P1–P10)
scripts/           migrate.ts, seed-admin.ts, geração de ícones, hooks de git
public/uploads/    Fotos de espécies (servidas estaticamente)
src/
  app/             Rotas (App Router)
    admin/         Cadastros: espécies, recipientes, insumos, custos fixos,
                   coleta de sementes, usuários
    insumos/       Registro de insumos em campo
    pedidos/       Rotina completa de pedidos
    login/ logout/ Fluxo de autenticação
    api/           Endpoints (ex.: notificações)
  components/      Componentes compartilhados (Toast, Autocomplete, sino de notificações)
  lib/             db, auth, orders, notifications, offline-queue, utilitários
  middleware.ts    Proteção de rotas por sessão
```

---

## Perfis de acesso

São quatro papéis, com visibilidade progressiva no menu inicial:

- **admin** — acesso total, incluindo gestão de usuários
- **chefia** — administração e pedidos (sem gestão de usuários)
- **gerencia** — pedidos
- **funcionario** — operações de campo (ex.: registrar insumo)

---

## Funcionalidades implementadas

- **Cadastros (admin):** espécies, recipientes, insumos, custos fixos, coleta de sementes e usuários.
- **Operação de campo:** registro de compra/uso de insumos com suporte offline.
- **Rotina de Pedidos** (fluxo completo):
  1. Cadastro do pedido e listagem
  2. Verificação de disponibilidade (mobile)
  3. Análise e fechamento pela chefia
  4. Separação por cargas, com calendário de entregas
- **Notificações** internas com sino e central de avisos.

O ciclo de vida do pedido percorre os status: `cadastrado → verificando_disponibilidade →
verificado → (pendente_alteracao) → aprovado → separando → pronto_envio`
(com `cancelado` à parte).

---

## Roadmap dos projetos

Os projetos são interdependentes; a ordem de implementação importa.

```
P1 (Custeio) ──┐
P2 (Perdas)  ──┤──→ P6 (Dashboard) ──→ P7 (Catálogo)
P3 (Preço)   ──┘                         ↓
                                     P9 (Site) → P10 (E-commerce)
P4 (WhatsApp) ← depende de P1+P3
P5 (Automação n8n) ← depende de P4
P8 (Instagram) ← independente
```

Os planos detalhados ficam em [`plans/`](plans/). Além deles, está em andamento a **Rotina de
Pedidos** (cadastro → verificação → fechamento → separação por cargas).

---

## Banco de dados

- O schema é **compartilhado entre todos os projetos**.
- Toda alteração deve ser um arquivo `.sql` em `migrations/` (compatível com `psql` puro),
  manter compatibilidade retroativa e ser documentada.
- A entidade central é a **espécie** — quase tudo se relaciona a ela.
- PostgreSQL: **local no desenvolvimento** (pgAdmin/`localhost`) e **Neon (cloud) na produção/Vercel**.
- Conexão via `DATABASE_URL`; pool singleton em `src/lib/db.ts`. O driver é escolhido pelo
  **host** da URL: `*.neon.tech` → `@neondatabase/serverless`; qualquer outro → `pg`
  (mesmo critério de `scripts/migrate.ts`). Importar como `import pool from '@/lib/db'`.
  Nunca usar o pool no lado cliente.

---

## Convenções

- Arquivos e identificadores em inglês; comentários podem ser em português.
- Tabelas: `snake_case` no plural (ex.: `species`, `loss_events`).
- Commits: Conventional Commits em português (ex.: `feat(pedidos): adiciona separação por cargas`).
- **Toda alteração de código deve incluir testes** (`*.test.ts` em `__tests__/`).
  O pre-commit hook roda lint e testes — commits são bloqueados se algo falhar.
- Formulários de campo: no máximo 5 campos por tela, dropdowns pré-definidos, botões grandes
  e feedback visual imediato.

Mais detalhes e regras de negócio em [`CLAUDE.md`](CLAUDE.md).
