CREATE TABLE doctor_rqes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
    rqe VARCHAR(20) NOT NULL,
    specialty VARCHAR(160) NOT NULL,
    is_principal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_doctor_rqes_doctor_specialty ON doctor_rqes (doctor_id, specialty);
CREATE UNIQUE INDEX idx_doctor_rqes_one_principal ON doctor_rqes (doctor_id) WHERE is_principal;

INSERT INTO doctor_rqes (doctor_id, rqe, specialty, is_principal)
SELECT id, rqe, specialty, true FROM doctors WHERE rqe IS NOT NULL AND specialty IS NOT NULL;

ALTER TABLE doctors DROP COLUMN rqe;
ALTER TABLE doctors DROP COLUMN specialty;
