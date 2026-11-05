CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    cpf VARCHAR(11),
    phone VARCHAR(40),
    email VARCHAR(200),
    birth_date DATE,
    birthplace VARCHAR(160),
    origin VARCHAR(160),
    address VARCHAR(500),
    mother_name VARCHAR(200),
    continuous_medications TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patients_doctor_id ON patients (doctor_id);
CREATE UNIQUE INDEX idx_patients_doctor_cpf ON patients (doctor_id, cpf) WHERE cpf IS NOT NULL;
