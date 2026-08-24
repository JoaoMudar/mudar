-- ============================================================
-- Configuracoes do sistema e periodo de trabalho
--
-- Especificacao: docs/rotinas/2-producao/01-agenda-de-pessoal.md (decisao 1)
-- Requisitos: RF-83 · Regras: RN-48 (emendada), RN-85
-- Entidades: C8 `settings`, `work_shifts`
--
-- DUAS TABELAS PARA DUAS NATUREZAS. Parametro que e UM VALOR mora em
-- `settings`; parametro que e UMA LISTA DE COISAS COM ATRIBUTOS vira entidade,
-- e e o caso do periodo de trabalho. E a mesma regra de corte dos Cadastros
-- (D4 §3.15).
--
-- A RN-48 dizia, no proprio enunciado, que um turno vale quatro horas. Isso
-- muda com a estacao e com a combinacao da equipe: convencao que muda e dado,
-- nao constante escondida no codigo.
--
-- SEM BEGIN/COMMIT PROPRIOS e SEM GUARDA CONDICIONAL (licao no 7).
-- ============================================================

CREATE TABLE settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  value       TEXT NOT NULL,
  value_type  TEXT NOT NULL,
  description TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES users(id),

  CONSTRAINT settings_value_type_valido
    CHECK (value_type IN ('texto', 'numero', 'booleano', 'data')),

  -- Chave em minusculas, com ponto separando o dominio: `producao.x`,
  -- `financeiro.y`. Sem isso a lista vira um saco de nomes soltos na tela de
  -- configuracoes.
  CONSTRAINT settings_key_formato CHECK (key ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$')
);

-- `value` e texto e `value_type` diz como le-lo. Uma coluna por tipo deixaria
-- tres nulas em toda linha; o tipo declarado e o que permite a tela apresentar
-- o campo certo e validar antes de gravar.

-- ------------------------------------------------------------
-- Carga inicial: o que hoje vive em variavel de ambiente ou constante de
-- codigo e E REGRA DE NEGOCIO, nao infraestrutura. Quem decide estes numeros e
-- a chefia, e mudar qualquer um deles hoje exige uma implantacao.
--
-- Nao entra aqui o que e de fato infraestrutura (DATABASE_URL, SENTRY_DSN):
-- esse continua em variavel de ambiente, e e a fronteira que separa as duas.
-- ------------------------------------------------------------
INSERT INTO settings (key, value, value_type, description) VALUES
  ('producao.mortalidade_limite_pct', '20',       'numero',
   'Mortalidade acima da qual a especie gera alerta (RN-17)'),
  ('viveiro.latitude',                '-27.2612', 'numero',
   'Latitude do viveiro, usada no calculo de distancia ate fornecedores'),
  ('viveiro.longitude',               '-49.6438', 'numero',
   'Longitude do viveiro, usada no calculo de distancia ate fornecedores'),
  ('comercial.margem_minima_revenda_pct', '20',   'numero',
   'Piso de margem na revenda de muda de terceiro (RN-21)');

-- ------------------------------------------------------------
-- O periodo de trabalho
-- ------------------------------------------------------------
CREATE TABLE work_shifts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  sort_order  INTEGER NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT work_shifts_code_valido CHECK (code IN ('manha', 'tarde')),
  CONSTRAINT work_shifts_intervalo_valido CHECK (end_time > start_time)
);

CREATE TRIGGER work_shifts_set_updated_at
  BEFORE UPDATE ON work_shifts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A duracao NAO e coluna: e `end_time - start_time`. Guarda-la permitiria que
-- divergisse dos horarios que a propria linha declara.
--
-- `code` e estavel e `name` e editavel: relatorio e carga inicial precisam de
-- um identificador que sobreviva a alguem renomear "Manha" para "Manha (verao)".
INSERT INTO work_shifts (code, name, start_time, end_time, sort_order) VALUES
  ('manha', 'Manhã', '07:00', '11:00', 1),
  ('tarde', 'Tarde', '13:00', '17:00', 2);

COMMENT ON TABLE settings IS
  'Parametro escalar do sistema, em chave e valor tipado. Regra de negocio, nao infraestrutura.';
COMMENT ON TABLE work_shifts IS
  'O periodo de trabalho. A duracao do turno sai daqui, e nao de constante (RN-85).';
