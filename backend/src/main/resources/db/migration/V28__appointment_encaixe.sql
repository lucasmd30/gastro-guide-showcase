-- Encaixe: o médico pode marcar um paciente num horário que já tem outro
-- agendamento (atendimento de última hora). Coluna nova com default, então
-- todo agendamento existente vira "não é encaixe" — nada muda neles.
ALTER TABLE appointments ADD COLUMN encaixe BOOLEAN NOT NULL DEFAULT FALSE;

-- O backstop de conflito da V11/V24 (um agendamento ativo por instante) não
-- vale para o encaixe, que existe justamente para dividir o horário. Entre
-- agendamentos normais ele continua valendo (inclusive contra a corrida de
-- dois pacientes escolhendo o mesmo horário pelo link). O índice novo é
-- menos restritivo que o antigo, então não tem como falhar ao ser criado.
DROP INDEX IF EXISTS idx_appointments_doctor_scheduled_active;

CREATE UNIQUE INDEX idx_appointments_doctor_scheduled_active
    ON appointments (doctor_id, scheduled_at)
    WHERE status NOT IN ('CANCELADO', 'FALTOU') AND NOT encaixe;
