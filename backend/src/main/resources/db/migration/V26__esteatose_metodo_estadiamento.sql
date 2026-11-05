-- Cabeçalho de Esteatose (MASLD), 14/10/2026: os campos de FIB-4, de
-- elastografia e de biópsia passaram a abrir só depois de escolhido o
-- "Método de estadiamento", e a lista de causas a descartar só abre com
-- "Descartadas outras causas de esteatose" = Não.
--
-- O formulário só envia campo visível. Sem esta migração, um cabeçalho já
-- gravado com, por exemplo, FIB-4 preenchido abriria com o FIB-4 escondido
-- (método ainda não marcado) e o próximo "Salvar cabeçalho" o descartaria.
-- Aqui o método é marcado a partir do que já está preenchido, e as causas
-- marcadas ganham o "Não" que as mantém à vista.
--
-- Só acrescenta chaves ao JSON: nenhum valor existente é alterado ou
-- removido. A elastografia de antes era a VCTE, que é o Fibroscan.
-- jsonb_exists/jsonb_exists_any em vez de ?/?| para o JDBC não confundir o
-- operador com parâmetro.

UPDATE patient_disease_headers p
SET data = p.data || jsonb_build_object('metodoEstadiamento', m.metodos)
FROM (
    SELECT h.id, jsonb_agg(v.metodo ORDER BY v.ordem) AS metodos
    FROM patient_disease_headers h
    CROSS JOIN LATERAL (VALUES
        (1, 'FIB-4', jsonb_exists_any(h.data, ARRAY['fib4Idade', 'fib4Ast', 'fib4Alt', 'fib4Plaquetas'])),
        (2, 'Fibroscan', jsonb_exists_any(h.data, ARRAY['elasto', 'elastoKpa', 'cap', 'capValor'])),
        (3, 'Biópsia', jsonb_exists_any(h.data,
                ARRAY['biopsiaFibrose', 'biopsiaEsteatose', 'biopsiaInflam', 'biopsiaBalon']))
    ) AS v(ordem, metodo, presente)
    WHERE h.disease = 'esteatose'
      AND v.presente
      AND NOT jsonb_exists(h.data, 'metodoEstadiamento')
    GROUP BY h.id
) m
WHERE p.id = m.id;

UPDATE patient_disease_headers
SET data = data || '{"outrasCausasDescartadas": "Não"}'::jsonb
WHERE disease = 'esteatose'
  AND jsonb_typeof(data -> 'causasDescartadas') = 'array'
  AND jsonb_array_length(data -> 'causasDescartadas') > 0
  AND NOT jsonb_exists(data, 'outrasCausasDescartadas');
