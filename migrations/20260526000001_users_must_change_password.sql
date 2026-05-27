-- Migration: 20260526000001_users_must_change_password.sql
-- Descricao: Flag para forcar troca de senha no proximo login.
-- Usada quando o admin cria um usuario ou redefine a senha (senha temporaria):
-- o usuario e obrigado a definir uma senha propria no primeiro acesso.
-- Retrocompativel: default false => usuarios existentes nao sao afetados.

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
