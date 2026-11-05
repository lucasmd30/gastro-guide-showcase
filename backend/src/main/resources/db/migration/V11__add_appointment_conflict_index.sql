-- Backstop de banco pro conflito de horário: a checagem em AppointmentService
-- é read-then-write (sem lock), então duas criações/reativações concorrentes
-- no mesmo instante ainda passavam pela checagem da aplicação e colidiam. Um
-- índice único parcial garante a invariante mesmo sob concorrência.
CREATE UNIQUE INDEX idx_appointments_doctor_scheduled_active
    ON appointments (doctor_id, scheduled_at)
    WHERE status <> 'CANCELADO';
