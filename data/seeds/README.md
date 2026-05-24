# Seeds de dados

Dados de carga inicial (seed) do banco. Não são migrações — são as **fontes** de onde
algumas migrações foram geradas.

## `mudas_export_corrigido.json`
Export das **142 espécies** do catálogo, fonte original do cadastro de `species`.

- **Quem consome:** `scripts/import-mudas.mjs` (importa o JSON na tabela `species`).
- **Já está aplicado:** a migração `migrations/20260520000002_import_142_species.sql` contém
  os `INSERT`s gerados a partir deste arquivo. Em um banco que rodou as migrações, as espécies
  **já existem** — não é preciso rodar o script.
- **Quando usar o script:** apenas para regenerar/re-importar manualmente em um banco que não
  passou pela migração. Requer `DATABASE_URL` no ambiente: `node scripts/import-mudas.mjs`.

O arquivo é, portanto, a **fonte histórica** do seed; a via oficial de carga é a migração.
