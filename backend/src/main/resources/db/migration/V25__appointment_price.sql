-- Valor da consulta particular (pedido da cliente, 13/10/2026). Aditiva:
-- só colunas novas e nulas, nenhum dado existente muda.
--
-- No médico, o valor padrão de cada tipo (como as durações da V17): todo
-- agendamento particular nasce com ele, e pode ser ajustado um a um.
-- Nulo = sem valor padrão definido.
ALTER TABLE doctors
    ADD COLUMN first_visit_price_cents INTEGER,
    ADD COLUMN follow_up_price_cents INTEGER;

ALTER TABLE doctors
    ADD CONSTRAINT doctors_prices_range CHECK (
        (first_visit_price_cents IS NULL OR first_visit_price_cents BETWEEN 0 AND 10000000)
        AND (follow_up_price_cents IS NULL OR follow_up_price_cents BETWEEN 0 AND 10000000));

-- No agendamento, o valor cobrado — só existe em particular, como o plano
-- só existe em convênio (V21).
ALTER TABLE appointments
    ADD COLUMN price_cents INTEGER;

ALTER TABLE appointments
    ADD CONSTRAINT appointments_price_only_for_particular CHECK (
        price_cents IS NULL OR (price_cents BETWEEN 0 AND 10000000 AND billing = 'PARTICULAR'));
