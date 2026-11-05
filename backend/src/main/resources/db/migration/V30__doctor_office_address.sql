-- Endereço comercial do médico (pedido de 23/10/2026), preenchido em "Meu
-- perfil" e impresso no cabeçalho dos documentos. Só acrescenta colunas
-- nulas — nenhum médico existente muda.
ALTER TABLE doctors
    ADD COLUMN office_cep        VARCHAR(8),
    ADD COLUMN office_street     VARCHAR(200),
    ADD COLUMN office_number     VARCHAR(20),
    ADD COLUMN office_complement VARCHAR(100),
    ADD COLUMN office_district   VARCHAR(120),
    ADD COLUMN office_city       VARCHAR(120),
    ADD COLUMN office_state      VARCHAR(2);
