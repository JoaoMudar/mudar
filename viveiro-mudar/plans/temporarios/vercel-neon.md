# Deploy — Vercel + Neon

## Status: EM ANDAMENTO
## Prioridade: ALTA
## Dependências: Banco local funcionando, dump.sql gerado
## Bloqueia: Acesso externo ao sistema (todos os projetos)

---

## Objetivo
Migrar o banco de dados local (PostgreSQL 17) para o Neon (serverless Postgres) e fazer deploy da aplicação Next.js no Vercel, tornando o sistema acessível via celular de qualquer lugar.

## Contexto
Hoje o sistema só roda na máquina do João. Gilberto e Débora não conseguem acessar. O banco está em PostgreSQL local, a aplicação em Next.js 15. O dump do banco já foi gerado (`dump.sql`). A migração para Neon + Vercel é o caminho mais rápido para deploy sem servidor dedicado.

## Resultado Esperado
- Aplicação acessível via URL pública (Vercel)
- Banco de dados em nuvem com todos os dados migrados (Neon)
- Variáveis de ambiente configuradas nos dois ambientes (local e Vercel)
- Pool de conexão adaptado para ambiente serverless

---

## Tarefas

### Fase 1: Criar e Popular o Banco no Neon

- [ ] **T1** Criar conta no Neon (neon.tech) e criar novo projeto `viveiro-mudar`
- [ ] **T2** Copiar a `DATABASE_URL` gerada pelo Neon (formato: `postgresql://user:pass@host/db?sslmode=require`)
- [ ] **T3** Restaurar o dump no banco Neon:
  ```bash
  psql "DATABASE_URL_DO_NEON" < dump.sql
  ```
- [ ] **T4** Verificar se as tabelas e dados foram importados corretamente:
  ```sql
  SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
  ```

### Fase 2: Adaptar a Conexão para Serverless

- [x] **T5** Instalar o driver serverless do Neon:
  ```bash
  npm install @neondatabase/serverless
  ```
- [x] **T6** Atualizar `src/lib/db.ts` para usar o driver do Neon em produção e manter `pg` em desenvolvimento
  - Pool com inicialização lazy (Proxy) — não estoura durante o build do Vercel sem DATABASE_URL
  - `next.config.ts` com `serverExternalPackages: ['pg', 'pg-native', '@neondatabase/serverless']` — evita falha de bundling no Vercel
- [ ] **T7** Testar localmente apontando `.env.local` para o banco Neon (garantir que nada quebrou)

### Fase 3: Configurar o Projeto no Vercel

- [ ] **T8** Fazer login no Vercel e importar o repositório do GitHub
  - Se o repo não estiver no GitHub ainda: criar repo, fazer push, importar
- [ ] **T9** Na tela de configuração do projeto no Vercel, definir as variáveis de ambiente:
  - `DATABASE_URL` → colar a URL do Neon
  - `NEXT_PUBLIC_APP_URL` → URL gerada pelo Vercel (preencher após primeiro deploy)
- [ ] **T10** Verificar se o build passa no Vercel (aba "Deployments")
- [ ] **T11** Acessar a URL pública e testar o fluxo principal (cadastrar insumo, listar espécies)

### Fase 4: Ajustes Pós-Deploy

- [ ] **T12** Configurar domínio personalizado no Vercel (se houver)
- [ ] **T13** Atualizar `.env.local` com a URL de produção para testes cruzados
- [ ] **T14** Testar no celular Android (Chrome) — verificar responsividade e PWA
- [ ] **T15** Criar novo dump de referência após migração confirmada

---

## Critérios de Aceite
- [ ] URL pública abre a aplicação sem erro
- [ ] Gilberto consegue acessar pelo celular
- [ ] Cadastro de insumo salva no banco Neon sem erro
- [ ] Dados do dump aparecem corretamente (espécies, recipientes, insumos)
- [ ] Build do Vercel passa sem warnings de conexão com banco

---

## Notas Técnicas
- O Neon usa conexões serverless — o pool padrão do `pg` pode esgotar conexões em produção. O `@neondatabase/serverless` resolve isso automaticamente.
- SSL é obrigatório no Neon: a `DATABASE_URL` já vem com `?sslmode=require`. Não remover.
- O Vercel tem timeout de 10s em funções serverless na camada gratuita — queries lentas podem falhar. Indexar colunas usadas em filtros frequentes.
- Se o repo ainda não estiver no GitHub, criar antes de importar no Vercel (Vercel não aceita upload direto de pasta).
- Fotos de espécies em `public/uploads/especies/` **não são persistidas** no Vercel (filesystem efêmero). Migrar para Vercel Blob ou Cloudinary antes do uso em produção com fotos.
