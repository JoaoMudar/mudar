-- Migration: 20260612000002_supplier_geo.sql
-- Descricao: Coordenadas do fornecedor para distancia/mapa (P11 Fase 4).
--
-- lat/lng vem do geocoding Nominatim por cidade/UF, SOB DEMANDA e com cache
-- aqui no banco (politica do Nominatim: 1 req/s, sempre cachear).
-- geocoded_at marca a tentativa: preenchido com lat/lng NULL = "nao achei"
-- (nao tenta de novo sozinho). Editar cidade/UF zera os tres campos na action
-- de update, forcando nova geocodificacao na proxima demanda.

BEGIN;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS lat NUMERIC(9,6) CHECK (lat BETWEEN -90 AND 90);

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS lng NUMERIC(9,6) CHECK (lng BETWEEN -180 AND 180);

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

COMMIT;
