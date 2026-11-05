CREATE TABLE doctor_crms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
    crm VARCHAR(20) NOT NULL,
    crm_uf VARCHAR(2) NOT NULL,
    is_principal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_doctor_crms_crm_uf ON doctor_crms (crm, crm_uf);
CREATE UNIQUE INDEX idx_doctor_crms_doctor_uf ON doctor_crms (doctor_id, crm_uf);
CREATE UNIQUE INDEX idx_doctor_crms_one_principal ON doctor_crms (doctor_id) WHERE is_principal;

INSERT INTO doctor_crms (doctor_id, crm, crm_uf, is_principal)
SELECT id, crm, crm_uf, true FROM doctors;

DROP INDEX idx_doctors_crm;
ALTER TABLE doctors DROP COLUMN crm;
ALTER TABLE doctors DROP COLUMN crm_uf;
