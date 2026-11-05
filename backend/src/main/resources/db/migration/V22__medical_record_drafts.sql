-- Rascunho automático do prontuário (export do Lovable de 06/10/2026): o que
-- a médica vai digitando fica salvo por paciente + modelo, e volta se a
-- página fechar antes de "Salvar no paciente". Não é registro clínico — é
-- descartado quando o registro é salvo —, por isso fica numa tabela própria
-- e nunca em medical_records. Aditiva.
CREATE TABLE medical_record_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
    form_key VARCHAR(80) NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_medical_record_drafts_patient_form
    ON medical_record_drafts (patient_id, form_key);
