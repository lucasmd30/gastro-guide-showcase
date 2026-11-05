CREATE TABLE secretaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_secretaries_doctor_id ON secretaries(doctor_id);

CREATE TABLE secretary_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secretary_id UUID NOT NULL REFERENCES secretaries(id) ON DELETE CASCADE,
    token_hash VARCHAR(100) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_secretary_refresh_tokens_secretary_id ON secretary_refresh_tokens(secretary_id);
