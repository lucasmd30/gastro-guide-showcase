-- Disponibilidade por período, modelo iClinic/Doctoralia: janelas que abrem
-- (período + faixas semanais) e bloqueios que fecham (período, dia inteiro
-- ou faixa de horas). Uma faixa passa a pertencer a uma janela; fora de
-- qualquer janela, nada é oferecido.

CREATE TABLE doctor_availability_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    -- Nulo = "até segunda ordem", o horário semanal fixo dos outros produtos.
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_availability_window_range CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_availability_windows_doctor ON doctor_availability_windows(doctor_id, start_date);

ALTER TABLE doctor_availability_rules
    ADD COLUMN window_id UUID REFERENCES doctor_availability_windows(id) ON DELETE CASCADE;

-- Faixas que já existem (só em banco de dev — produção não tem nenhuma)
-- viram uma janela aberta a partir de hoje, uma por médico.
INSERT INTO doctor_availability_windows (doctor_id, start_date)
SELECT DISTINCT doctor_id, CURRENT_DATE FROM doctor_availability_rules;

UPDATE doctor_availability_rules r
SET window_id = w.id
FROM doctor_availability_windows w
WHERE w.doctor_id = r.doctor_id;

ALTER TABLE doctor_availability_rules ALTER COLUMN window_id SET NOT NULL;

CREATE INDEX idx_availability_rules_window ON doctor_availability_rules(window_id);

CREATE TABLE doctor_availability_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    -- Horas nulas = dia inteiro; preenchidas = a faixa vale em cada dia do período.
    start_time TIME,
    end_time TIME,
    reason VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_availability_block_range CHECK (end_date >= start_date),
    CONSTRAINT chk_availability_block_times CHECK ((start_time IS NULL) = (end_time IS NULL)),
    CONSTRAINT chk_availability_block_time_order CHECK (start_time IS NULL OR end_time > start_time)
);

CREATE INDEX idx_availability_blocks_doctor ON doctor_availability_blocks(doctor_id, start_date);
