-- Convênios que o médico atende, preenchidos em "Meu perfil". Alimentam o
-- link de consulta: o paciente que escolhe convênio só pode escolher um
-- destes. Tabela relacional (não JSONB) pela mesma regra de doctor_crms e
-- doctor_rqes: dado estruturado e fixo. Aditiva.
CREATE TABLE doctor_health_plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id   UUID         NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- "Unimed" e "unimed" são o mesmo convênio.
CREATE UNIQUE INDEX idx_doctor_health_plans_name ON doctor_health_plans (doctor_id, lower(name));
