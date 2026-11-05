-- Presencial ou teleconsulta: o médico precisa saber, ao abrir o dia, que
-- tipo de atendimento vai passar. Presencial é o padrão — é o que todo
-- agendamento existente era.
ALTER TABLE appointments
    ADD COLUMN modality VARCHAR(20) NOT NULL DEFAULT 'PRESENCIAL';

ALTER TABLE appointments ALTER COLUMN modality DROP DEFAULT;
