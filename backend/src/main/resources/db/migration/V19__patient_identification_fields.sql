-- Sexo, profissão, estado civil e religião saem do cabeçalho da consulta de
-- hepatologia e passam a ser cadastro do paciente: são dados de
-- identificação, não achado da consulta, e repetidos a cada atendimento
-- criariam uma segunda fonte da verdade (pedido da cliente).
ALTER TABLE patients
    ADD COLUMN sex VARCHAR(20),
    ADD COLUMN profession VARCHAR(160),
    ADD COLUMN marital_status VARCHAR(60),
    ADD COLUMN religion VARCHAR(80);
