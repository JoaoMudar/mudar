# 🪞 Banco local espelho do Neon

> Como trazer os dados de produção (Neon) para um Postgres local, para testar à
> vontade **sem nunca tocar no banco real**.

## Por que isso existe

O `CLAUDE.md` diz que dev e produção compartilham o mesmo banco no Neon. Para
testes destrutivos (apagar pedidos, mudar status, mexer em estoque) isso é
arriscado. A solução é manter um **Postgres local descartável** que é recriado a
partir de uma cópia fresca do Neon sempre que necessário.

- **Fonte:** Neon (produção), acessado **somente em leitura** pelo `pg_dump`.
- **Alvo:** Postgres 17 local (`localhost:5432`, banco `viveiro`), visível no pgAdmin.
- Cada refresh **apaga e recria** o banco local. Pode bagunçar à vontade: é só
  rodar de novo para voltar ao estado de produção.

## Pré-requisitos

- **PostgreSQL 17** instalado localmente (em `C:\Program Files\PostgreSQL\17`).
  O script usa o `pg_dump`/`psql`/`pg_restore` de lá.
  > A versão do cliente precisa ser **≥** à do servidor Neon. Se um dia o Neon for
  > atualizado para uma versão maior, atualize o PostgreSQL local.
- Variáveis no `.env.local` (arquivo fora do git):

  ```env
  # Fonte (produção, só leitura) e alvo (local) do espelhamento:
  NEON_DATABASE_URL=postgresql://<user>:<senha>@<host>.neon.tech/neondb?sslmode=require
  LOCAL_DATABASE_URL=postgresql://postgres:<senha>@127.0.0.1:5432/viveiro
  ```

  O `DATABASE_URL` que o app usa é separado, aponte para o local enquanto testa.

## Como usar

```powershell
npm run db:refresh-local
```

O script (`scripts/refresh-local-db.ps1`) faz, em sequência:

1. `pg_dump` do Neon → arquivo temporário (formato custom, `--no-owner --no-privileges`).
2. `DROP DATABASE viveiro WITH (FORCE)` + `CREATE DATABASE viveiro` (recria do zero).
3. `pg_restore` no banco local.

Depois é só abrir o pgAdmin: os dados estão lá.

## Travas de segurança

O script **aborta** se:

- `NEON_DATABASE_URL` não contiver `neon.tech` (fonte suspeita), ou
- `LOCAL_DATABASE_URL` apontar para `neon.tech` (evita restaurar por cima da produção), ou
- o alvo não for `localhost`/`127.0.0.1`.

Ou seja: é impossível, por engano, escrever no banco real.

## Notas

- **`npm test` não depende disto**: os testes usam mocks do banco (ver `CLAUDE.md`).
- O script é **ASCII puro de propósito**: o Windows PowerShell 5.1 lê `.ps1` como
  ANSI, então acentos e travessões (`—`) quebram o parser. Mantenha assim ao editar.
- Dumps locais (`*.dump`) já estão no `.gitignore`: não são versionados.
