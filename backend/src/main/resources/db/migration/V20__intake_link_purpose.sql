-- O link passa a ter uma finalidade escolhida por quem gera: AGENDAMENTO (o
-- paciente escolhe o horário, fluxo que já existia) ou CADASTRO (o paciente
-- só preenche os dados — tipicamente porque a secretária já marcou a
-- consulta pela agenda).
--
-- Aditiva: links já em circulação eram todos de agendamento, e o default
-- mantém esse comportamento.
ALTER TABLE patient_intake_tokens
    ADD COLUMN purpose VARCHAR(20) NOT NULL DEFAULT 'AGENDAMENTO';
