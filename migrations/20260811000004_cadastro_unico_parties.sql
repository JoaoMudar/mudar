-- ============================================================
-- Cadastro unico — schema `cadastro`
--
-- Especificacao: docs/rotinas/rotina-financeiro/01-cadastro-unico.md
-- Fase 1 compartilhada de P13 (T13.1) e P12 — feita uma vez, serve aos dois.
--
-- O problema: identidade de pessoa partida em duas tabelas sem ligacao.
-- `customers` (quem compra) e `suppliers` (quem vende muda). A mesma pessoa
-- vira dois registros, e nao cabe ninguem que nao seja nem um nem outro —
-- funcionario, socio, contador, banco, prefeitura —, que e exatamente para
-- quem o dinheiro sai no extrato do financeiro.
--
-- ADITIVA: `customers` e `suppliers` continuam com todas as colunas e ganham
-- so um `party_id`. Nenhuma tela, Server Action ou teste atual quebra.
--
-- SEM BEGIN/COMMIT PROPRIOS: scripts/migrate.ts ja envolve cada arquivo numa
-- transacao. Com COMMIT interno, uma falha nas assercoes do fim deixaria o
-- schema criado, o backfill pela metade e a migration NAO registrada — e o
-- deploy seguinte tentaria rodar tudo de novo sobre estado sujo. Do jeito que
-- esta, o pior caso e um deploy vermelho com o banco intacto.
--
-- SEM GUARDA CONDICIONAL (licao no 7 do post-mortem, e o achado J da
-- auditoria de 11/08/2026): migration que checa antes de agir roda como no-op
-- e ainda assim e marcada como aplicada.
-- ============================================================

CREATE SCHEMA cadastro;

-- ------------------------------------------------------------
-- A identidade
-- ------------------------------------------------------------
CREATE TABLE cadastro.parties (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Natureza da pessoa, NAO o papel: o papel vive em party_roles, porque uma
  -- pessoa acumula papeis (o caso que motivou a tabela e alguem que vende
  -- muda e tambem compra). NULL = nao informado; o cadastro simples legado
  -- nao preenchia person_type, e chutar 'pf' para uma prefeitura seria pior
  -- do que admitir que nao se sabe.
  kind       VARCHAR(2) CHECK (kind IN ('pf', 'pj')),
  document   VARCHAR(14),              -- so digitos, normalizado no app
  name       TEXT NOT NULL,            -- nome usual, o que aparece nas listas
  legal_name TEXT,                     -- razao social (PJ)
  trade_name TEXT,                     -- nome fantasia (PJ)
  email      TEXT,
  phone      VARCHAR(20),
  whatsapp   VARCHAR(20),              -- so digitos, como em suppliers
  notes      TEXT,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- UNIQUE parcial, mesmo padrao do idx_customers_document: documento e unico
-- quando existe, e a maioria dos cadastros nao tem.
CREATE UNIQUE INDEX idx_parties_document ON cadastro.parties (document)
  WHERE document IS NOT NULL;
CREATE INDEX idx_parties_name   ON cadastro.parties (LOWER(TRIM(name)));
CREATE INDEX idx_parties_active ON cadastro.parties (active);

CREATE TRIGGER parties_updated_at
  BEFORE UPDATE ON cadastro.parties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Os papeis (N por identidade)
-- ------------------------------------------------------------
CREATE TABLE cadastro.party_roles (
  party_id   UUID NOT NULL REFERENCES cadastro.parties (id) ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL CHECK (role IN (
               'cliente', 'fornecedor', 'funcionario', 'socio', 'familiar',
               'banco', 'governo', 'contador', 'outro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (party_id, role)
);

-- `funcionario` aqui e VINCULO EMPREGATICIO, e nao nivel de acesso. O nivel de
-- acesso e `users.role`, cujo valor foi renomeado para `colaborador` na
-- migration 20260810000001 justamente para desfazer esta ambiguidade.
CREATE INDEX idx_party_roles_role ON cadastro.party_roles (role);

-- ------------------------------------------------------------
-- Enderecos (N por identidade)
-- ------------------------------------------------------------
CREATE TABLE cadastro.addresses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id     UUID NOT NULL REFERENCES cadastro.parties (id) ON DELETE CASCADE,
  label        VARCHAR(20) NOT NULL DEFAULT 'principal'
               CHECK (label IN ('principal', 'entrega', 'cobranca', 'outro')),
  zip_code     VARCHAR(8),
  street       TEXT,
  -- `number` e nao `address_number`: dentro desta tabela nao ha ambiguidade.
  -- A coluna antiga customers.address_number continua existindo e so sai na
  -- fase que migrar as telas.
  number       VARCHAR(20),
  complement   TEXT,
  neighborhood TEXT,
  city         TEXT,
  state        VARCHAR(2),
  ibge_code    VARCHAR(7),
  lat          NUMERIC(9,6) CHECK (lat BETWEEN -90 AND 90),
  lng          NUMERIC(9,6) CHECK (lng BETWEEN -180 AND 180),
  geocoded_at  TIMESTAMPTZ,
  is_primary   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_party ON cadastro.addresses (party_id);
-- No maximo um endereco principal por pessoa — do contrario "o endereco do
-- cliente" deixa de ter resposta.
CREATE UNIQUE INDEX idx_addresses_one_primary ON cadastro.addresses (party_id)
  WHERE is_primary;

CREATE TRIGGER addresses_updated_at
  BEFORE UPDATE ON cadastro.addresses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Ligacao aditiva com o que ja existe
-- ------------------------------------------------------------
ALTER TABLE customers ADD COLUMN party_id UUID REFERENCES cadastro.parties (id);
ALTER TABLE suppliers ADD COLUMN party_id UUID REFERENCES cadastro.parties (id);

CREATE INDEX idx_customers_party ON customers (party_id);
CREATE INDEX idx_suppliers_party ON suppliers (party_id);

-- ============================================================
-- BACKFILL
--
-- O id da party e o proprio id do registro de origem. Nao e enfeite: torna o
-- mapeamento deterministico e conferivel sem tabela auxiliar, e faz o backfill
-- ser reexecutavel mentalmente ("a party do cliente X e X").
-- ============================================================

-- 1. Uma party para cada cliente.
INSERT INTO cadastro.parties
  (id, kind, document, name, legal_name, trade_name, email, phone, notes, active, created_at, updated_at)
SELECT c.id,
       c.person_type,
       c.document,
       COALESCE(NULLIF(TRIM(c.name), ''), 'Sem nome'),
       c.legal_name,
       c.trade_name,
       c.email,
       c.phone,
       c.notes,
       COALESCE(c.active, true),
       COALESCE(c.created_at, NOW()),
       COALESCE(c.updated_at, NOW())
FROM customers c;

INSERT INTO cadastro.party_roles (party_id, role)
SELECT c.id, 'cliente' FROM customers c;

UPDATE customers SET party_id = id;

-- 2. Casamento fornecedor <-> cliente.
--
-- A especificacao previa casar por `document` quando os dois lados tivessem, e
-- por nome caso contrario. Na pratica `suppliers` NAO TEM coluna document,
-- entao 100% do casamento cai no nome normalizado. Registrado aqui porque e
-- diferente do que a spec sugere.
--
-- Ambiguidade e aceita, nao resolvida: nomes iguais com documentos diferentes
-- viram duas parties, e a fusao e manual depois — `mergeCustomers` ja e o
-- precedente de UX para isso. O ORDER BY existe so para o resultado nao
-- depender da ordem fisica das linhas.
UPDATE suppliers s
   SET party_id = (
     SELECT p.id
       FROM cadastro.parties p
       JOIN cadastro.party_roles r ON r.party_id = p.id AND r.role = 'cliente'
      WHERE LOWER(TRIM(p.name)) = LOWER(TRIM(s.name))
      ORDER BY p.created_at, p.id
      LIMIT 1
   )
 WHERE TRIM(s.name) <> '';

-- 3. Fornecedor que nao casou com ninguem ganha party propria.
INSERT INTO cadastro.parties
  (id, name, email, phone, whatsapp, notes, active, created_at, updated_at)
SELECT s.id,
       COALESCE(NULLIF(TRIM(s.name), ''), 'Sem nome'),
       s.email,
       s.phone,
       s.whatsapp,
       s.notes,
       s.active,
       s.created_at,
       s.updated_at
FROM suppliers s
WHERE s.party_id IS NULL;

UPDATE suppliers SET party_id = id WHERE party_id IS NULL;

-- 4. Papel fornecedor. ON CONFLICT porque quem casou com um cliente ja tem
-- linha em party_roles — e o ponto: uma identidade, dois papeis.
INSERT INTO cadastro.party_roles (party_id, role)
SELECT s.party_id, 'fornecedor' FROM suppliers s
ON CONFLICT (party_id, role) DO NOTHING;

-- 5. Enderecos. Cliente primeiro, porque so ele tem endereco estruturado.
INSERT INTO cadastro.addresses
  (party_id, label, zip_code, street, number, complement, neighborhood, city, state, is_primary)
SELECT c.party_id, 'principal', c.zip_code, c.street, c.address_number,
       c.complement, c.neighborhood, c.city, c.state, true
FROM customers c
WHERE c.party_id IS NOT NULL
  AND (c.zip_code IS NOT NULL OR c.street IS NOT NULL OR c.city IS NOT NULL);

-- Fornecedor so tem cidade/UF e coordenada. Nao sobrescreve o endereco do
-- cliente quando os dois sao a mesma pessoa: o do cliente e mais completo.
INSERT INTO cadastro.addresses
  (party_id, label, city, state, lat, lng, geocoded_at, is_primary)
SELECT s.party_id, 'principal', s.city, s.state, s.lat, s.lng, s.geocoded_at, true
FROM suppliers s
WHERE s.party_id IS NOT NULL
  AND (s.city IS NOT NULL OR s.lat IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM cadastro.addresses a WHERE a.party_id = s.party_id AND a.is_primary
  );

-- ============================================================
-- ASSERCOES — rodam dentro da mesma transacao. Falhar aqui desfaz tudo, que e
-- o comportamento desejado: backfill pela metade e pior que backfill nenhum.
-- ============================================================
DO $$
DECLARE n INTEGER;
BEGIN
  SELECT count(*) INTO n FROM customers WHERE party_id IS NULL;
  IF n > 0 THEN RAISE EXCEPTION 'Backfill: % cliente(s) sem party_id', n; END IF;

  SELECT count(*) INTO n FROM suppliers WHERE party_id IS NULL;
  IF n > 0 THEN RAISE EXCEPTION 'Backfill: % fornecedor(es) sem party_id', n; END IF;

  SELECT count(*) INTO n FROM cadastro.parties p
   WHERE NOT EXISTS (SELECT 1 FROM cadastro.party_roles r WHERE r.party_id = p.id);
  IF n > 0 THEN RAISE EXCEPTION 'Backfill: % party(ies) sem papel', n; END IF;

  SELECT count(*) INTO n FROM (
    SELECT document FROM cadastro.parties
     WHERE document IS NOT NULL GROUP BY document HAVING count(*) > 1
  ) d;
  IF n > 0 THEN RAISE EXCEPTION 'Backfill: % documento(s) duplicado(s)', n; END IF;
END $$;
