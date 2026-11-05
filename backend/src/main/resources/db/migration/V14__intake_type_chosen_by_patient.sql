-- Quem escolhe entre primeira consulta e retorno passa a ser o paciente, no
-- próprio link, e não mais quem gerou o link. O tipo vira opcional no token:
-- nulo significa "ainda não escolhido", e o valor definitivo chega no
-- POST /api/intake/{token}/agendar.
--
-- Links já gerados mantêm o tipo que carregam — não vira nulo retroativamente,
-- pra não mudar o comportamento de um link que já está circulando no WhatsApp.
ALTER TABLE patient_intake_tokens ALTER COLUMN appointment_type DROP NOT NULL;
