-- ============================================================
--  VIVEIRO MUDAR — SCHEMA UNIFICADO
--  Operacional + Fiscal + Histórico
--  PostgreSQL 14+
--  Gerado em: 2026-04-06
-- ==========================

-- ============================================================
-- EXTENSÕES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS unaccent;   -- busca sem acento em nomes

CREATE OR REPLACE FUNCTION unaccent_immutable(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT lower($1);
$$;

-- ============================================================
-- TIPOS ENUMERADOS
-- ============================================================

CREATE TYPE tipo_cliente       AS ENUM ('atacado', 'varejo', 'governo', 'ong');
CREATE TYPE categoria_custo    AS ENUM ('direto', 'indireto', 'fixo');
CREATE TYPE status_venda       AS ENUM ('orcamento', 'confirmado', 'entregue', 'cancelado');
CREATE TYPE status_entrega     AS ENUM ('agendada', 'em_rota', 'entregue', 'cancelada');
CREATE TYPE veiculo_tipo       AS ENUM ('van', 'caminhao', 'terceirizado');
CREATE TYPE tipo_nota_fiscal   AS ENUM ('saida_empresa', 'entrada_produtor', 'entrada_fornecedor');
CREATE TYPE tipo_despesa       AS ENUM ('fixo', 'variavel', 'extraordinario');
CREATE TYPE tipo_centro_custo  AS ENUM ('empresa', 'casa', 'sitio');


-- ============================================================
-- ENDEREÇOS
-- Separado para suportar múltiplos endereços por entidade
-- e preenchimento automático via ViaCEP
-- ============================================================

CREATE TABLE enderecos (
    id           SERIAL PRIMARY KEY,
    cep          CHAR(8),                    -- somente números, sem hífen
    logradouro   TEXT,
    numero       TEXT,                       -- TEXT: "S/N", "Km 12", etc.
    complemento  TEXT,
    bairro       TEXT,
    cidade       TEXT        NOT NULL,
    estado       CHAR(2)     NOT NULL,
    ibge_codigo  CHAR(7),                    -- código IBGE vindo do ViaCEP
    created_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- CENTROS DE CUSTO
-- Empresa / Casa / Sítio (fonte das despesas em Excel)
-- ============================================================

CREATE TABLE centros_custo (
    id          SERIAL PRIMARY KEY,
    nome        TEXT                NOT NULL,
    tipo        tipo_centro_custo   NOT NULL,
    descricao   TEXT,
    ativo       BOOLEAN             DEFAULT TRUE,
    created_at  TIMESTAMP           DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- CATEGORIAS DE DESPESA
-- Combustível, energia, salários, insumos…
-- ============================================================

CREATE TABLE categorias_despesa (
    id          SERIAL PRIMARY KEY,
    nome        TEXT            NOT NULL,
    tipo        tipo_despesa    NOT NULL DEFAULT 'variavel',
    grupo       TEXT,           -- 'pessoal' | 'insumos' | 'infraestrutura' | 'logistica' | 'administrativo'
    ativo       BOOLEAN         DEFAULT TRUE,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- ESPÉCIES
-- Normaliza o TEXT livre de produtos/mudas
-- ============================================================

CREATE TABLE especies (
    id                          SERIAL PRIMARY KEY,
    nome_comum                  TEXT        NOT NULL,
    nome_cientifico             TEXT,
    bioma                       TEXT,       -- 'Mata Atlântica', 'Cerrado', etc.
    tempo_medio_producao_dias   INTEGER,    -- base para custo de mão de obra
    taxa_perda_media            NUMERIC(5,2),   -- % histórica de perda
    ativa                       BOOLEAN     DEFAULT TRUE,
    created_at                  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- CLIENTES
-- ============================================================

CREATE TABLE clientes (
    id           SERIAL PRIMARY KEY,
    nome         TEXT            NOT NULL,
    documento    TEXT,           -- CPF ou CNPJ sem formatação
    endereco_id  INTEGER         REFERENCES enderecos(id),
    contato      TEXT,
    email        TEXT,
    tipo         tipo_cliente    NOT NULL DEFAULT 'atacado',
    ativo        BOOLEAN         DEFAULT TRUE,
    created_at   TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- FORNECEDORES
-- Inclui produtores rurais (tipo = 'produtor_rural')
-- ============================================================

CREATE TABLE fornecedores (
    id           SERIAL PRIMARY KEY,
    nome         TEXT    NOT NULL,
    documento    TEXT,           -- CPF ou CNPJ sem formatação
    tipo         TEXT,           -- 'produtor_rural' | 'insumos' | 'servicos' | 'transporte'
    contato      TEXT,
    email        TEXT,
    endereco_id  INTEGER  REFERENCES enderecos(id),
    ativo        BOOLEAN  DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- INSUMOS E HISTÓRICO DE PREÇO
-- ============================================================

CREATE TABLE insumos (
    id             SERIAL PRIMARY KEY,
    nome           TEXT    NOT NULL,
    unidade        TEXT    NOT NULL,    -- 'kg' | 'L' | 'saco' | 'unidade'
    fornecedor_id  INTEGER  REFERENCES fornecedores(id),
    ativo          BOOLEAN  DEFAULT TRUE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE insumos_precos (
    id               SERIAL PRIMARY KEY,
    insumo_id        INTEGER     NOT NULL REFERENCES insumos(id),
    custo_unitario   NUMERIC(10,2) NOT NULL,
    vigente_em       DATE        NOT NULL DEFAULT CURRENT_DATE,
    created_at       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- LOTES DE PRODUÇÃO
-- Coração do sistema operacional
-- ============================================================

CREATE TABLE lotes (
    id                      SERIAL PRIMARY KEY,
    especie_id              INTEGER     NOT NULL REFERENCES especies(id),
    centro_custo_id         INTEGER     REFERENCES centros_custo(id),
    data_inicio             DATE        NOT NULL,
    data_prevista_saida     DATE,
    data_saida              DATE,           -- quando ficou pronto de fato
    quantidade_inicial      INTEGER     NOT NULL,
    quantidade_final        INTEGER,        -- após perdas
    custo_total_calculado   NUMERIC(12,2),  -- calculado via lotes_insumos
    observacoes             TEXT,
    created_at              TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lotes_insumos (
    id                          SERIAL PRIMARY KEY,
    lote_id                     INTEGER     NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
    insumo_id                   INTEGER     NOT NULL REFERENCES insumos(id),
    quantidade                  NUMERIC(10,3) NOT NULL,
    custo_unitario_na_epoca     NUMERIC(10,2) NOT NULL,    -- snapshot do preço vigente
    custo_total                 NUMERIC(12,2) GENERATED ALWAYS AS
                                    (quantidade * custo_unitario_na_epoca) STORED,
    created_at                  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- CUSTOS OPERACIONAIS
-- Custos diretos ou indiretos vinculados a lotes
-- ============================================================

CREATE TABLE custos (
    id               SERIAL PRIMARY KEY,
    data             DATE            NOT NULL,
    categoria        categoria_custo NOT NULL,
    tipo             TEXT            NOT NULL,   -- 'combustivel' | 'energia' | 'salario' …
    descricao        TEXT,
    valor            NUMERIC(12,2)   NOT NULL,
    lote_id          INTEGER         REFERENCES lotes(id),
    centro_custo_id  INTEGER         REFERENCES centros_custo(id),
    created_at       TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- VENDAS E ITENS
-- ============================================================

CREATE TABLE vendas (
    id               SERIAL PRIMARY KEY,
    data             DATE            NOT NULL,
    cliente_id       INTEGER         NOT NULL REFERENCES clientes(id),
    nota_fiscal_id   INTEGER,        -- FK adicionada após criar notas_fiscais (ver ALTER abaixo)
    status           status_venda    NOT NULL DEFAULT 'orcamento',
    frete_cobrado    NUMERIC(10,2)   DEFAULT 0,
    desconto         NUMERIC(10,2)   DEFAULT 0,
    observacoes      TEXT,
    created_at       TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE itens_venda (
    id               SERIAL PRIMARY KEY,
    venda_id         INTEGER     NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    especie_id       INTEGER     NOT NULL REFERENCES especies(id),
    lote_id          INTEGER     REFERENCES lotes(id),   -- rastreabilidade: muda de qual lote
    quantidade       INTEGER     NOT NULL,
    preco_unitario   NUMERIC(10,2) NOT NULL,
    subtotal         NUMERIC(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
    created_at       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- ENTREGAS
-- ============================================================

CREATE TABLE entregas (
    id                  SERIAL PRIMARY KEY,
    venda_id            INTEGER         NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    data_agendada       DATE,
    data_realizada      DATE,
    status              status_entrega  NOT NULL DEFAULT 'agendada',
    veiculo             veiculo_tipo,
    distancia_km        NUMERIC(10,2),
    custo_combustivel   NUMERIC(10,2),
    custo_pedagio       NUMERIC(10,2)   DEFAULT 0,
    custo_total         NUMERIC(12,2),
    observacoes         TEXT,
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- NOTAS FISCAIS  (NFe PDFs — empresa 2011-2025, produtor 2018-2026)
-- ============================================================

CREATE TABLE notas_fiscais (
    id               SERIAL PRIMARY KEY,
    numero           TEXT            NOT NULL,
    serie            TEXT,
    data_emissao     DATE            NOT NULL,
    tipo_nota        tipo_nota_fiscal NOT NULL,

    -- Exatamente um dos dois campos abaixo deve ser preenchido
    cliente_id       INTEGER         REFERENCES clientes(id),
    fornecedor_id    INTEGER         REFERENCES fornecedores(id),

    -- Valores monetários
    valor_produtos   NUMERIC(14,2),
    valor_desconto   NUMERIC(14,2)   DEFAULT 0,
    valor_frete      NUMERIC(14,2)   DEFAULT 0,
    valor_icms       NUMERIC(14,2),
    valor_total      NUMERIC(14,2)   NOT NULL,

    centro_custo_id  INTEGER         REFERENCES centros_custo(id),

    -- Período desnormalizado para performance analítica
    ano  SMALLINT NOT NULL GENERATED ALWAYS AS (EXTRACT(YEAR  FROM data_emissao)::SMALLINT) STORED,
    mes  SMALLINT NOT NULL GENERATED ALWAYS AS (EXTRACT(MONTH FROM data_emissao)::SMALLINT) STORED,

    arquivo_pdf      TEXT,           -- caminho relativo ao PDF original
    hash_arquivo     TEXT UNIQUE,    -- SHA-256 do PDF — evita reimportação duplicada

    importado_em     TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    observacao       TEXT,

    CONSTRAINT chk_nf_entidade CHECK (
        (cliente_id IS NOT NULL AND fornecedor_id IS NULL) OR
        (cliente_id IS NULL AND fornecedor_id IS NOT NULL)
    )
);

-- FK bidirecional: venda pode referenciar sua NF de saída
ALTER TABLE vendas
    ADD CONSTRAINT fk_vendas_nota_fiscal
    FOREIGN KEY (nota_fiscal_id) REFERENCES notas_fiscais(id);

CREATE TABLE itens_nf (
    id               SERIAL PRIMARY KEY,
    nf_id            INTEGER         NOT NULL REFERENCES notas_fiscais(id) ON DELETE CASCADE,
    especie_id       INTEGER         REFERENCES especies(id),   -- NULL até mapeamento
    descricao_nf     TEXT            NOT NULL,  -- texto original extraído do PDF
    ncm              TEXT,
    quantidade       NUMERIC(12,3)   NOT NULL,
    unidade          TEXT,
    valor_unitario   NUMERIC(14,4)   NOT NULL,
    valor_total      NUMERIC(14,2)   GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    created_at       TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- DESPESAS GERAIS  (Excel 2000-2008 — empresa / casa / sítio)
-- ============================================================

CREATE TABLE despesas (
    id               SERIAL PRIMARY KEY,
    data             DATE            NOT NULL,
    descricao        TEXT            NOT NULL,
    valor            NUMERIC(14,2)   NOT NULL,
    categoria_id     INTEGER         REFERENCES categorias_despesa(id),
    centro_custo_id  INTEGER         NOT NULL REFERENCES centros_custo(id),

    ano  SMALLINT NOT NULL GENERATED ALWAYS AS (EXTRACT(YEAR  FROM data)::SMALLINT) STORED,
    mes  SMALLINT NOT NULL GENERATED ALWAYS AS (EXTRACT(MONTH FROM data)::SMALLINT) STORED,

    documento_ref    TEXT,   -- número do documento original se houver
    fonte            TEXT,   -- nome do arquivo Excel de origem
    observacao       TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- CONTROLE DE NOTAS  (Excel manual 2004-2025)
-- Receitas brutas coletadas à mão — tabela de staging histórico
-- ============================================================

CREATE TABLE controle_notas (
    id               SERIAL PRIMARY KEY,
    data             DATE            NOT NULL,
    numero_nota      TEXT,

    -- Cliente pode ou não estar no cadastro
    cliente_id       INTEGER         REFERENCES clientes(id),
    cliente_nome     TEXT,           -- nome bruto do Excel

    -- Espécie pode ou não estar mapeada
    especie_id       INTEGER         REFERENCES especies(id),
    produto_descricao TEXT,          -- descrição bruta do Excel

    valor_bruto      NUMERIC(14,2)   NOT NULL,
    quantidade       INTEGER,

    ano  SMALLINT NOT NULL GENERATED ALWAYS AS (EXTRACT(YEAR  FROM data)::SMALLINT) STORED,
    mes  SMALLINT NOT NULL GENERATED ALWAYS AS (EXTRACT(MONTH FROM data)::SMALLINT) STORED,

    fonte            TEXT,           -- nome do arquivo Excel de origem
    linha_excel      INTEGER,        -- linha original para rastreabilidade
    observacao       TEXT,
    created_at       TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- ÍNDICES — OPERACIONAIS
-- ============================================================

CREATE INDEX idx_vendas_cliente         ON vendas(cliente_id);
CREATE INDEX idx_vendas_status          ON vendas(status);
CREATE INDEX idx_vendas_data            ON vendas(data DESC);
CREATE INDEX idx_vendas_nf              ON vendas(nota_fiscal_id)
    WHERE nota_fiscal_id IS NOT NULL;

CREATE INDEX idx_itens_venda_venda      ON itens_venda(venda_id);
CREATE INDEX idx_itens_venda_especie    ON itens_venda(especie_id);
CREATE INDEX idx_itens_venda_lote       ON itens_venda(lote_id)
    WHERE lote_id IS NOT NULL;

CREATE INDEX idx_lotes_especie          ON lotes(especie_id);
CREATE INDEX idx_lotes_data_inicio      ON lotes(data_inicio DESC);
CREATE INDEX idx_lotes_centro_custo     ON lotes(centro_custo_id);

CREATE INDEX idx_lotes_insumos_lote     ON lotes_insumos(lote_id);
CREATE INDEX idx_lotes_insumos_insumo   ON lotes_insumos(insumo_id);

CREATE INDEX idx_custos_data            ON custos(data DESC);
CREATE INDEX idx_custos_lote            ON custos(lote_id)
    WHERE lote_id IS NOT NULL;
CREATE INDEX idx_custos_centro_custo    ON custos(centro_custo_id);

CREATE INDEX idx_entregas_venda         ON entregas(venda_id);
CREATE INDEX idx_entregas_status        ON entregas(status);
CREATE INDEX idx_entregas_data          ON entregas(data_agendada);

CREATE INDEX idx_insumos_precos_insumo  ON insumos_precos(insumo_id, vigente_em DESC);


-- ============================================================
-- ÍNDICES — FISCAIS
-- ============================================================

CREATE INDEX idx_nf_data_emissao        ON notas_fiscais(data_emissao DESC);
CREATE INDEX idx_nf_ano_mes             ON notas_fiscais(ano, mes);
CREATE INDEX idx_nf_tipo                ON notas_fiscais(tipo_nota);
CREATE INDEX idx_nf_cliente             ON notas_fiscais(cliente_id)
    WHERE cliente_id IS NOT NULL;
CREATE INDEX idx_nf_fornecedor          ON notas_fiscais(fornecedor_id)
    WHERE fornecedor_id IS NOT NULL;
CREATE INDEX idx_nf_centro_custo        ON notas_fiscais(centro_custo_id);
CREATE INDEX idx_nf_hash                ON notas_fiscais(hash_arquivo)
    WHERE hash_arquivo IS NOT NULL;

CREATE INDEX idx_itens_nf_nf            ON itens_nf(nf_id);
CREATE INDEX idx_itens_nf_especie       ON itens_nf(especie_id)
    WHERE especie_id IS NOT NULL;


-- ============================================================
-- ÍNDICES — DESPESAS E CONTROLE
-- ============================================================

CREATE INDEX idx_despesas_data          ON despesas(data DESC);
CREATE INDEX idx_despesas_ano_mes       ON despesas(ano, mes);
CREATE INDEX idx_despesas_centro_custo  ON despesas(centro_custo_id);
CREATE INDEX idx_despesas_categoria     ON despesas(categoria_id);

CREATE INDEX idx_controle_data          ON controle_notas(data DESC);
CREATE INDEX idx_controle_ano_mes       ON controle_notas(ano, mes);
CREATE INDEX idx_controle_cliente       ON controle_notas(cliente_id)
    WHERE cliente_id IS NOT NULL;
CREATE INDEX idx_controle_especie       ON controle_notas(especie_id)
    WHERE especie_id IS NOT NULL;


-- ============================================================
-- ÍNDICES — LOOKUP E BUSCA TEXTUAL
-- ============================================================

CREATE INDEX idx_clientes_documento     ON clientes(documento)
    WHERE documento IS NOT NULL;
CREATE INDEX idx_fornecedores_documento ON fornecedores(documento)
    WHERE documento IS NOT NULL;

-- Busca por nome sem acento (deduplicação e fuzzy matching)
CREATE INDEX idx_clientes_nome_unaccent
ON clientes(unaccent_immutable(lower(nome)));

CREATE INDEX idx_fornecedores_nome_unaccent
ON fornecedores(unaccent_immutable(lower(nome)));

CREATE INDEX idx_especies_nome_unaccent
ON especies(unaccent_immutable(lower(nome_comum)));

CREATE INDEX idx_controle_cliente_nome
ON controle_notas(unaccent_immutable(lower(cliente_nome)))
WHERE cliente_nome IS NOT NULL;

CREATE INDEX idx_itens_nf_descricao
ON itens_nf(unaccent_immutable(lower(descricao_nf)));


-- ============================================================
-- VIEWS ANALÍTICAS
-- ============================================================

-- ----------------------------------------------------------
-- KPI principal de produção: custo real por muda
-- ----------------------------------------------------------
CREATE VIEW vw_custo_por_muda AS
SELECT
    l.id                                                    AS lote_id,
    e.nome_comum                                            AS especie,
    l.data_inicio,
    l.quantidade_inicial,
    l.quantidade_final,
    COALESCE(SUM(li.custo_total), 0)                        AS custo_insumos,
    COALESCE(c.custo_rateado, 0)                            AS custo_operacional_rateado,
    COALESCE(SUM(li.custo_total), 0)
        + COALESCE(c.custo_rateado, 0)                      AS custo_total_lote,
    CASE
        WHEN l.quantidade_final > 0 THEN
            (COALESCE(SUM(li.custo_total), 0)
             + COALESCE(c.custo_rateado, 0)) / l.quantidade_final
        ELSE NULL
    END                                                     AS custo_por_muda
FROM lotes l
JOIN especies e ON e.id = l.especie_id
LEFT JOIN lotes_insumos li ON li.lote_id = l.id
LEFT JOIN (
    SELECT lote_id, SUM(valor) AS custo_rateado
    FROM custos
    WHERE lote_id IS NOT NULL
    GROUP BY lote_id
) c ON c.lote_id = l.id
GROUP BY l.id, e.nome_comum, l.data_inicio,
         l.quantidade_inicial, l.quantidade_final, c.custo_rateado;


-- ----------------------------------------------------------
-- Lucro por venda (operacional)
-- ----------------------------------------------------------
CREATE VIEW vw_lucro_venda AS
SELECT
    v.id,
    v.data,
    cl.nome                                             AS cliente,
    SUM(iv.subtotal)                                    AS receita_produtos,
    v.frete_cobrado,
    COALESCE(e.custo_total, 0)                          AS custo_entrega,
    SUM(iv.quantidade * cp.custo_por_muda)              AS custo_producao,
    (SUM(iv.subtotal) + v.frete_cobrado)
        - (SUM(iv.quantidade * cp.custo_por_muda)
           + COALESCE(e.custo_total, 0))                AS lucro
FROM vendas v
JOIN clientes cl ON cl.id = v.cliente_id
JOIN itens_venda iv ON iv.venda_id = v.id
LEFT JOIN vw_custo_por_muda cp ON cp.lote_id = iv.lote_id
LEFT JOIN entregas e ON e.venda_id = v.id
GROUP BY v.id, v.data, cl.nome, v.frete_cobrado, e.custo_total;


-- ----------------------------------------------------------
-- Resultado mensal — unifica TODAS as fontes de receita e despesa
-- ----------------------------------------------------------
CREATE VIEW vw_resultado_mensal AS
WITH receitas AS (

    SELECT  -- vendas operacionais confirmadas/entregues
        EXTRACT(YEAR  FROM v.data)::INT  AS ano,
        EXTRACT(MONTH FROM v.data)::INT  AS mes,
        SUM(iv.subtotal + v.frete_cobrado) AS valor,
        'venda_operacional'              AS fonte
    FROM vendas v
    JOIN itens_venda iv ON iv.venda_id = v.id
    WHERE v.status IN ('confirmado', 'entregue')
    GROUP BY 1, 2

    UNION ALL

    SELECT  -- NFe de saída (empresa)
        ano, mes,
        SUM(valor_total) AS valor,
        'nfe_saida_empresa' AS fonte
    FROM notas_fiscais
    WHERE tipo_nota = 'saida_empresa'
    GROUP BY ano, mes

    UNION ALL

    SELECT  -- controle de notas histórico (manual)
        ano, mes,
        SUM(valor_bruto) AS valor,
        'controle_manual' AS fonte
    FROM controle_notas
    GROUP BY ano, mes
),

despesas_agg AS (

    SELECT  -- despesas gerais dos Excels
        ano, mes,
        SUM(valor) AS valor,
        'despesa_excel' AS fonte
    FROM despesas
    GROUP BY ano, mes

    UNION ALL

    SELECT  -- custos operacionais de lotes
        EXTRACT(YEAR  FROM data)::INT AS ano,
        EXTRACT(MONTH FROM data)::INT AS mes,
        SUM(valor) AS valor,
        'custo_operacional' AS fonte
    FROM custos
    GROUP BY 1, 2

    UNION ALL

    SELECT  -- NFe de entrada (compras de produtores/fornecedores)
        ano, mes,
        SUM(valor_total) AS valor,
        'nfe_entrada' AS fonte
    FROM notas_fiscais
    WHERE tipo_nota IN ('entrada_produtor', 'entrada_fornecedor')
    GROUP BY ano, mes
)

SELECT
    COALESCE(r.ano,  d.ano)  AS ano,
    COALESCE(r.mes,  d.mes)  AS mes,
    COALESCE(r.total, 0)     AS receita_total,
    COALESCE(d.total, 0)     AS despesa_total,
    COALESCE(r.total, 0) - COALESCE(d.total, 0) AS resultado
FROM (SELECT ano, mes, SUM(valor) AS total FROM receitas       GROUP BY ano, mes) r
FULL OUTER JOIN
     (SELECT ano, mes, SUM(valor) AS total FROM despesas_agg   GROUP BY ano, mes) d
ON r.ano = d.ano AND r.mes = d.mes
ORDER BY 1, 2;


-- ----------------------------------------------------------
-- Mix de espécies — volume e receita por espécie (todas as fontes)
-- ----------------------------------------------------------
CREATE VIEW vw_mix_especies AS
SELECT
    e.id,
    e.nome_comum                                AS especie,
    e.nome_cientifico,
    COALESCE(SUM(iv.quantidade),    0)          AS qtd_vendas_op,
    COALESCE(SUM(iv.subtotal),      0)          AS receita_vendas_op,
    COALESCE(SUM(inf.quantidade),   0)          AS qtd_nfe,
    COALESCE(SUM(inf.valor_total),  0)          AS receita_nfe,
    COALESCE(SUM(cn.quantidade),    0)          AS qtd_controle,
    COALESCE(SUM(cn.valor_bruto),   0)          AS receita_controle,
    -- total consolidado
    COALESCE(SUM(iv.subtotal), 0)
        + COALESCE(SUM(inf.valor_total), 0)
        + COALESCE(SUM(cn.valor_bruto),  0)     AS receita_total
FROM especies e
LEFT JOIN itens_venda iv   ON iv.especie_id  = e.id
LEFT JOIN itens_nf    inf  ON inf.especie_id = e.id
LEFT JOIN controle_notas cn ON cn.especie_id = e.id
GROUP BY e.id, e.nome_comum, e.nome_cientifico
ORDER BY receita_total DESC;


-- ----------------------------------------------------------
-- Ranking de clientes (vendas operacionais)
-- ----------------------------------------------------------
CREATE VIEW vw_ranking_clientes AS
SELECT
    cl.id,
    cl.nome,
    cl.tipo,
    COUNT(DISTINCT v.id)            AS total_pedidos,
    COALESCE(SUM(iv.subtotal), 0)   AS receita_total,
    COALESCE(AVG(iv.subtotal), 0)   AS ticket_medio,
    MIN(v.data)                     AS primeira_compra,
    MAX(v.data)                     AS ultima_compra,
    -- recência em dias
    CURRENT_DATE - MAX(v.data)      AS dias_desde_ultima_compra
FROM clientes cl
LEFT JOIN vendas v ON v.cliente_id = cl.id
    AND v.status IN ('confirmado', 'entregue')
LEFT JOIN itens_venda iv ON iv.venda_id = v.id
GROUP BY cl.id, cl.nome, cl.tipo
ORDER BY receita_total DESC;


-- ----------------------------------------------------------
-- Fluxo de caixa acumulado (útil para projeções)
-- ----------------------------------------------------------
CREATE VIEW vw_fluxo_caixa_acumulado AS
SELECT
    ano,
    mes,
    receita_total,
    despesa_total,
    resultado,
    SUM(resultado) OVER (ORDER BY ano, mes) AS saldo_acumulado
FROM vw_resultado_mensal;


-- ============================================================
-- SEED DATA — TABELAS DE REFERÊNCIA
-- ============================================================

INSERT INTO centros_custo (nome, tipo, descricao) VALUES
    ('Empresa', 'empresa', 'Operações principais do viveiro'),
    ('Casa',    'casa',    'Despesas residenciais vinculadas ao negócio'),
    ('Sítio',   'sitio',   'Armazenamento e produção no sítio');

INSERT INTO categorias_despesa (nome, tipo, grupo) VALUES
    ('Combustível',               'variavel',       'logistica'),
    ('Energia elétrica',          'fixo',            'infraestrutura'),
    ('Água',                      'fixo',            'infraestrutura'),
    ('Salários',                  'fixo',            'pessoal'),
    ('Mão de obra temporária',    'variavel',        'pessoal'),
    ('Insumos agrícolas',         'variavel',        'insumos'),
    ('Embalagens e sacolas',      'variavel',        'insumos'),
    ('Manutenção de equipamentos','variavel',        'infraestrutura'),
    ('Frete de compras',          'variavel',        'logistica'),
    ('Impostos e taxas',          'fixo',            'administrativo'),
    ('Telefone / Internet',       'fixo',            'administrativo'),
    ('Alimentação',               'variavel',        'pessoal'),
    ('Aluguéis',                  'fixo',            'infraestrutura'),
    ('Seguros',                   'fixo',            'administrativo'),
    ('Outros',                    'variavel',        'administrativo');


-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
-- Próximo passo: python import_excel.py (despesas + controle de notas)
-- Depois:        python import_nfe_pdfs.py (notas fiscais)
-- ============================================================
