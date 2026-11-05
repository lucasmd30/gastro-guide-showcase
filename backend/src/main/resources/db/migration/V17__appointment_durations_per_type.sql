-- Duração por tipo de atendimento, e não por faixa da grade: o médico
-- define uma vez quanto dura uma primeira consulta e quanto dura um
-- retorno, e vale para todos até ele mudar (modelo Doctoralia/iClinic, em
-- que a duração é atributo do serviço/procedimento).
ALTER TABLE doctors
    ADD COLUMN first_visit_minutes INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN follow_up_minutes INTEGER NOT NULL DEFAULT 15;

ALTER TABLE doctors
    ADD CONSTRAINT chk_doctor_first_visit_minutes CHECK (first_visit_minutes BETWEEN 5 AND 240),
    ADD CONSTRAINT chk_doctor_follow_up_minutes CHECK (follow_up_minutes BETWEEN 5 AND 240);

-- A faixa deixa de carregar duração: ela marca só a janela de atendimento,
-- e quem dá o tamanho do horário é o tipo escolhido. Sem dado real em
-- produção (nenhuma conta de médico criada) — ver documentação interna.
ALTER TABLE doctor_availability_rules DROP CONSTRAINT chk_availability_slot;
ALTER TABLE doctor_availability_rules DROP COLUMN slot_minutes;
