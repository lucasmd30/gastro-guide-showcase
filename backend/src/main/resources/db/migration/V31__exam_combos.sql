-- Solicitação de exames (28/10/2026): combos que o médico salva ("Meus
-- combos") e os combos marcados como favoritos. No protótipo Lovable os dois
-- ficam no localStorage; aqui ficam na conta, para valer em qualquer máquina.
-- Só tabelas novas.

CREATE TABLE exam_combos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id   UUID         NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    -- Lista de nomes de exame, os mesmos rótulos do catálogo (ou digitados).
    items_json  JSONB        NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_exam_combos_doctor_name ON exam_combos (doctor_id, lower(name));

-- Favorito é pelo nome: vale tanto para combo próprio quanto para os combos
-- prontos do catálogo, que só existem no frontend.
CREATE TABLE exam_combo_favorites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id   UUID         NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
    combo_name  VARCHAR(100) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_exam_combo_favorites ON exam_combo_favorites (doctor_id, combo_name);
