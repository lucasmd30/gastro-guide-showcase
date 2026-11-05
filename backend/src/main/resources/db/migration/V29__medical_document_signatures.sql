-- PDF assinado digitalmente anexado a um documento médico emitido. O médico
-- gera o PDF do documento, assina no assinador que já usa (certificado
-- ICP-Brasil em nuvem — VIDaaS, BirdID, SafeID, RemoteID, NeoID —, token
-- A1/A3, ou gov.br) e anexa o arquivo aqui. Só acrescenta uma tabela: o
-- documento em si continua definitivo e não muda.
--
-- Um por documento (anexar de novo substitui o arquivo). Excluir o paciente
-- leva o documento e, com ele, a assinatura.
CREATE TABLE medical_document_signatures (
    document_id      UUID PRIMARY KEY REFERENCES medical_documents (id) ON DELETE CASCADE,
    pdf              BYTEA        NOT NULL,
    file_name        VARCHAR(200),
    sha256           VARCHAR(64)  NOT NULL,
    -- O que a conferência leu do certificado de quem assinou.
    signer_name      VARCHAR(200),
    signer_cpf       VARCHAR(11),
    issuer           VARCHAR(400),
    -- ICP_BRASIL = qualificada (Lei 14.063/2020); GOV_BR = avançada; OUTRA.
    level            VARCHAR(20)  NOT NULL CHECK (level IN ('ICP_BRASIL', 'GOV_BR', 'OUTRA')),
    signed_at        TIMESTAMPTZ,
    signature_count  INT          NOT NULL,
    -- Falso quando há bytes acrescentados ao PDF depois da última assinatura.
    covers_document  BOOLEAN      NOT NULL,
    uploaded_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
