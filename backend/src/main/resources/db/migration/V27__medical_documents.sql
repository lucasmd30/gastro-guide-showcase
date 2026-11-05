-- Documentos médicos (atestados, declarações, encaminhamentos, relatórios,
-- solicitações de exame, orientações), como a tela "Documentos" do
-- protótipo Lovable. Só acrescenta tabelas — nada existente muda.

-- Documento emitido. Definitivo por decisão do usuário (14/10/2026): não há
-- edição nem exclusão — documento oficial errado se corrige emitindo outro.
-- Por isso doctor_id não cascateia (mesma regra de medical_records), e o
-- CRM/RQE usados ficam congelados no próprio documento, como no registro.
-- Excluir o paciente leva os documentos junto, como leva o prontuário.
CREATE TABLE medical_documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id  UUID         NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
    doctor_id   UUID         NOT NULL REFERENCES doctors (id),
    kind        VARCHAR(20)  NOT NULL CHECK (kind IN
                    ('ATESTADO', 'DECLARACAO', 'ENCAMINHAMENTO', 'RELATORIO', 'SOLICITACAO', 'ORIENTACAO', 'OUTRO')),
    -- Modelo de origem ("atestado_afastamento", "tpl:<id>"…), só para referência.
    model       VARCHAR(80),
    title       VARCHAR(200) NOT NULL,
    -- O texto final, como foi impresso — é ele que tem valor de documento.
    content     TEXT         NOT NULL,
    -- Os campos do modelo que geraram o texto (dias, datas, CID…).
    data_json   JSONB,
    crm         VARCHAR(20)  NOT NULL,
    crm_uf      VARCHAR(2)   NOT NULL,
    rqe         VARCHAR(20),
    specialty   VARCHAR(150),
    issued_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_medical_documents_patient ON medical_documents (patient_id, issued_at DESC);

-- Textos que o médico salva para reusar ("Meus modelos" e as orientações
-- próprias). Diferente do documento, é rascunho dele: edita e apaga à vontade.
CREATE TABLE document_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id   UUID         NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
    -- DOCUMENTO aparece na galeria de modelos; ORIENTACAO, no seletor de orientações prontas.
    kind        VARCHAR(20)  NOT NULL CHECK (kind IN ('DOCUMENTO', 'ORIENTACAO')),
    name        VARCHAR(160) NOT NULL,
    content     TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_templates_doctor ON document_templates (doctor_id);
