-- Falta ("FALTOU") passa a liberar o horário, como o cancelamento: o médico
-- pode adiantar outro paciente para o horário de quem faltou. O backstop de
-- conflito da V11 precisa seguir a mesma regra de AppointmentStatus.occupiesSlot,
-- senão mover alguém para o instante exato de uma falta daria violação de
-- índice. Só troca o índice — nenhum dado muda, e o índice novo é menos
-- restritivo que o antigo, então não há como ele falhar ao ser criado.
DROP INDEX IF EXISTS idx_appointments_doctor_scheduled_active;

CREATE UNIQUE INDEX idx_appointments_doctor_scheduled_active
    ON appointments (doctor_id, scheduled_at)
    WHERE status NOT IN ('CANCELADO', 'FALTOU');
