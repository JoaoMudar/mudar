-- Migration: 20260526000002_login_audit_and_session_meta.sql
-- Descricao: Auditoria de login + metadados de dispositivo na sessao.
--  - sessions.ip / sessions.user_agent: identificam o aparelho na tela de
--    "sessoes ativas" (/conta/sessoes), permitindo encerrar um celular perdido.
--  - login_events: registra toda tentativa de login (sucesso e falha) com
--    usuario tentado, IP e user-agent — trilha de auditoria de acesso.
-- Retrocompativel: colunas/tabela novas, nada e alterado no que ja existe.

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip         TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE TABLE IF NOT EXISTS login_events (
  id                 UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  username_attempted TEXT NOT NULL,
  success            BOOLEAN NOT NULL,
  ip                 TEXT,
  user_agent         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_events_user_id    ON login_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_events_created_at ON login_events (created_at DESC);
