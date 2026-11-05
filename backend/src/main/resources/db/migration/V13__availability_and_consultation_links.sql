-- Grade semanal de disponibilidade do médico: uma linha por faixa contínua
-- de um dia da semana. "Seg a sex, 08:00-12:00 e 14:00-18:00" são 10 linhas.
CREATE TABLE doctor_availability_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    weekday VARCHAR(10) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_minutes INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_availability_range CHECK (end_time > start_time),
    CONSTRAINT chk_availability_slot CHECK (slot_minutes > 0)
);

CREATE INDEX idx_availability_doctor_weekday ON doctor_availability_rules(doctor_id, weekday);

-- O link de consulta passa a pertencer ao médico, não a um paciente: é o que
-- permite gerá-lo antes de o paciente existir. patient_id vira opcional
-- (preenchido só quando o link é gerado a partir de um cadastro que já
-- existe) e o token carrega o tipo da consulta escolhido por quem gerou.
ALTER TABLE patient_intake_tokens ADD COLUMN doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE;
ALTER TABLE patient_intake_tokens ADD COLUMN appointment_type VARCHAR(20) NOT NULL DEFAULT 'PRIMEIRA_CONSULTA';

UPDATE patient_intake_tokens t
SET doctor_id = p.doctor_id
FROM patients p
WHERE p.id = t.patient_id;

ALTER TABLE patient_intake_tokens ALTER COLUMN doctor_id SET NOT NULL;
ALTER TABLE patient_intake_tokens ALTER COLUMN patient_id DROP NOT NULL;
ALTER TABLE patient_intake_tokens ALTER COLUMN appointment_type DROP DEFAULT;

CREATE INDEX idx_patient_intake_tokens_doctor_id ON patient_intake_tokens(doctor_id);
