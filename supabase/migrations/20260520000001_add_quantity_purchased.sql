-- Adiciona campo de quantidade comprada ao cadastro de insumos
ALTER TABLE inputs ADD COLUMN quantity_purchased NUMERIC(10,2);
