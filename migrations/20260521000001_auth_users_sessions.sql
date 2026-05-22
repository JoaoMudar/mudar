-- Migration: 20260521000001_auth_users_sessions.sql
-- Descricao: Cria tabelas de autenticacao (users, sessions) com 4 roles

CREATE TYPE user_role AS ENUM ('admin', 'chefia', 'gerencia', 'funcionario');

CREATE TABLE users (
  id                    UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  username              TEXT NOT NULL UNIQUE,
  display_name          TEXT NOT NULL,
  password_hash         TEXT NOT NULL,
  role                  user_role NOT NULL DEFAULT 'funcionario',
  active                BOOLEAN NOT NULL DEFAULT true,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE sessions (
  id           UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_token_hash ON sessions (token_hash);
CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_users_username ON users (username);
