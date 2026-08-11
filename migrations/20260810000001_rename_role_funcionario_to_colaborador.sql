-- Migration: 20260810000001_rename_role_funcionario_to_colaborador.sql
-- Descricao: Renomeia o valor 'funcionario' do ENUM user_role para 'colaborador'.
--
-- POR QUE: toda a documentacao (rotinas, D4 Matriz RBAC, C1 casos de uso, B2
-- requisitos, G2 indicadores) chama esse perfil de "Colaborador" — a palavra
-- 'funcionario' so existia no banco e no codigo. Ver docs/auditoria-divergencias.md,
-- achado D.
--
-- E precisa acontecer ANTES do cadastro unico (P13/P12 Fase 1), que introduz
-- cadastro.party_roles com o papel 'funcionario' em outro sentido: la significa
-- "esta pessoa trabalha aqui" e vale ate para quem nao tem login. Deixar os dois
-- com o mesmo nome faria a matriz de acesso brigar com o cadastro.
--
--   user_role.colaborador          -> nivel de acesso no app
--   party_roles.role = funcionario -> vinculo empregaticio com o viveiro
--
-- RENAME VALUE preserva o OID do rotulo, entao o DEFAULT da coluna users.role e
-- as linhas ja gravadas acompanham a mudanca sozinhas — nao ha backfill a fazer.
-- Sem guarda condicional: migration que vira no-op e ainda assim e marcada como
-- aplicada e a licao no 7 do post-mortem (docs/postmortem-financeiro-bi.md).

BEGIN;

ALTER TYPE user_role RENAME VALUE 'funcionario' TO 'colaborador';

COMMIT;
