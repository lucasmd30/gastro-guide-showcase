CREATE TABLE patient_disease_headers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
    disease VARCHAR(40) NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_patient_disease_headers_patient_disease
    ON patient_disease_headers (patient_id, disease);

CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors (id),
    type VARCHAR(20) NOT NULL,
    disease VARCHAR(40),
    title VARCHAR(200) NOT NULL,
    content_text TEXT NOT NULL DEFAULT '',
    content_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medical_records_patient ON medical_records (patient_id, created_at DESC);
