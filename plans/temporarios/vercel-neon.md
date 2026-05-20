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

- [x] **T1** Criar conta no Neon (neon.tech) e criar novo projeto `viveiro-mudar`
- [x] **T2** Copiar a `DATABASE_URL` gerada pelo Neon (formato: `postgresql://user:pass@host/db?sslmode=require`)
- [x] **T3** Restaurar o dump no banco Neon (schema via dump.sql + 142 espécies migradas via script Node.js)
- [x] **T4** Verificar se as tabelas e dados foram importados corretamente (7 tabelas + 142 species confirmadas)

### Fase 2: Adaptar a Conexão para Serverless

- [x] **T5** Instalar o driver serverless do Neon
- [x] **T6** Atualizar `src/lib/db.ts` para usar o driver do Neon em produção e manter `pg` em desenvolvimento
  - Pool com inicialização lazy (Proxy) — não estoura durante o build do Vercel sem DATABASE_URL
  - `next.config.ts` com `serverExternalPackages: ['pg', 'pg-native', '@neondatabase/serverless']` — evita falha de bundling no Vercel
- [x] **T7** Testar localmente apontando `.env.local` para o banco Neon (garantir que nada quebrou)

### Fase 3: Configurar o Projeto no Vercel

- [x] **T8** Fazer login no Vercel e importar o repositório do GitHub
- [x] **T9** Variáveis de ambiente configuradas (DATABASE_URL do Neon)
- [x] **T10** Build passa no Vercel
- [x] **T11** Espécies aparecem corretamente na URL pública

### Fase 4: Ajustes Pós-Deploy

- [ ] **T12** Domínio personalizado (viveiromudar.com.br) — pendente, acessando via URL do Vercel por enquanto
- [x] **T13** `.env.local` atualizado com `NEXT_PUBLIC_APP_URL=https://viveiromudar.com.br`
- [x] **T14** Testado no celular Android — funcionando
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
