-- Contratação do atendimento (pedido da cliente): particular, convênio ou
-- cortesia, e o plano quando for convênio. Nulo = não informado — é o caso
-- das consultas marcadas pelo próprio paciente no link, que a secretária
-- completa depois na agenda. Aditiva: nenhum agendamento existente muda.
ALTER TABLE appointments
    ADD COLUMN billing VARCHAR(20),
    ADD COLUMN health_plan VARCHAR(120);

ALTER TABLE appointments
    ADD CONSTRAINT appointments_health_plan_only_for_convenio
        CHECK (health_plan IS NULL OR billing = 'CONVENIO');
