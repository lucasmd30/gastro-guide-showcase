package com.gastroguide.medicalrecord;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class DiseaseRegistryTest {

    @Test
    void aceitaCampoEValorValidos() {
        assertDoesNotThrow(() -> DiseaseRegistry.validate("drge",
                Map.of("criterio", "Clínico (resposta ao IBP)")));
    }

    @Test
    void rejeitaDoencaInexistente() {
        var ex = assertThrows(ResponseStatusException.class,
                () -> DiseaseRegistry.validate("doenca-fake", Map.of()));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void rejeitaCampoDesconhecido() {
        assertThrows(ResponseStatusException.class,
                () -> DiseaseRegistry.validate("drge", Map.of("campoFake", "x")));
    }

    @Test
    void rejeitaValorForaDasOpcoes() {
        assertThrows(ResponseStatusException.class,
                () -> DiseaseRegistry.validate("drge", Map.of("criterio", "Valor Inventado")));
    }

    @Test
    void aceitaCampoMultiComListaDeValoresValidos() {
        assertDoesNotThrow(() -> DiseaseRegistry.validate("dii",
                Map.of("dcLocalizacao", List.of("L1 íleo terminal", "L2 cólon"))));
    }

    @Test
    void rejeitaCampoMultiComValorForaDasOpcoes() {
        assertThrows(ResponseStatusException.class,
                () -> DiseaseRegistry.validate("dii", Map.of("dcLocalizacao", List.of("Valor Fake"))));
    }

    @Test
    void aceitaCampoTextComQualquerString() {
        assertDoesNotThrow(() -> DiseaseRegistry.validate("drge", Map.of("praga", "C2M5")));
    }

    @Test
    void aceitaCampoTableComLinhas() {
        assertDoesNotThrow(() -> DiseaseRegistry.validate("cbp",
                Map.of("labs", List.of(Map.of("data", "2026-08", "fa", "180")))));
    }

    /*
     * Contagem de campos por doença — bate com a transcrição do protótipo.
     * As 10 primeiras vêm de disease-configs.ts (a HAI sem o scoreSimplificado,
     * que é a escala aihsimple); CBP/CEP/Esteatose vêm dos componentes
     * CbpHeader/CepHeader/EsteatoseHeader. Em 04/11/2026 entrou o que a cliente
     * pediu no PDF — não tudo o que o export trouxe (DRGE sem Lyon/GERD-Q/IBP,
     * Celíaca sem Biagi etc., por decisão dela) —, e a EoE segue o passo a
     * passo dela, sem EREFS e EndoFLIP soltos.
     */
    @Test
    void cadaDoencaTemAContagemDeCamposEsperada() {
        Map<String, Integer> esperado = Map.ofEntries(
                Map.entry("drge", 13),
                Map.entry("dii", 24),
                Map.entry("disfagia", 26),
                Map.entry("eoe", 11),
                Map.entry("cirrose", 17),
                Map.entry("gastro-op2", 34),
                Map.entry("celiaca", 23),
                Map.entry("hcv", 25),
                Map.entry("hbv", 36),
                Map.entry("hai", 25),
                Map.entry("cbp", 21),
                Map.entry("cep", 14),
                // Esteatose: o NAS digitado virou conta e entrou o resultado do
                // FIB-4 (13/10/2026); o Sim/Não da biópsia virou "Método de
                // estadiamento", as causas ganharam o Sim/Não que as abre e o
                // risco CV virou o quadro PREVENT (14/10/2026), que passou a
                // calcular e ganhou a meta de LDL-c: 21 itens (04/11/2026).
                Map.entry("esteatose", 41),
                // Modelos gerais de consulta. Contagens baixas de propósito: o
                // corpo dessas telas do protótipo é o conjunto genérico de
                // ConsultationSectionRegistry, então o cabeçalho carrega só o
                // que sobra. hepato-geral tem só o "Cabeçalho livre" (sexo,
                // profissão, estado civil e religião viraram cadastro do
                // paciente na V19); gastro-op1 (Gastro — Guiada) também ficou só
                // com ele desde 13/10/2026 — os sintomas foram para a consulta;
                // gastro-branco (Gastro — Livre) só tem o "Cabeçalho livre" — o resto
                // é o conjunto genérico; pagina-branca é a folha livre.
                Map.entry("hepato-geral", 1),
                Map.entry("gastro-op1", 1),
                Map.entry("gastro-branco", 1),
                Map.entry("pagina-branca", 1));

        assertEquals(esperado.keySet(), DiseaseRegistry.ALL.keySet());
        esperado.forEach((slug, count) ->
                assertEquals(count, DiseaseRegistry.getOrThrow(slug).fields().size(), slug));
    }

    /*
     * Os campos de "fenótipo" da DRGE e "diagnóstico" da DII são MULTI no
     * protótipo, e todos os blocos condicionais dessas duas doenças dependem
     * deles via showIf/includes. Transcritos como SINGLE, esses blocos ficam
     * inalcançáveis — foi o que aconteceu durante toda a Fase 0.
     */
    @Test
    void camposQueGovernamBlocosCondicionaisSaoMulti() {
        assertEquals(DiseaseFieldType.MULTI, campo("drge", "fenotipo").type());
        assertEquals(DiseaseFieldType.MULTI, campo("dii", "diagnostico").type());
    }

    @Test
    void drgeTemOCampoDeEda() {
        assertEquals(DiseaseFieldType.TEXT, campo("drge", "eda").type());
    }

    /**
     * Invariante que, quebrada, gera campo condicional morto: uma condição
     * "includes" só casa contra um array, então o campo apontado precisa ser
     * MULTI.
     */
    @Test
    void todaCondicaoIncludesApontaParaCampoMulti() {
        for (DiseaseDefinition definition : DiseaseRegistry.ALL.values()) {
            Map<String, DiseaseField> porChave = definition.fields().stream()
                    .collect(java.util.stream.Collectors.toMap(DiseaseField::key, f -> f));
            for (DiseaseField field : definition.fields()) {
                if (field.showIf() == null) continue;
                for (DiseaseField.ShowIf condition : field.showIf()) {
                    DiseaseField target = porChave.get(condition.key());
                    assertNotNull(target,
                            definition.slug() + "." + field.key() + " depende de campo inexistente " + condition.key());
                    if (condition.includes() != null) {
                        assertEquals(DiseaseFieldType.MULTI, target.type(),
                                definition.slug() + "." + field.key() + " usa includes sobre " + condition.key()
                                        + ", que não é MULTI — o campo nunca apareceria");
                    } else {
                        assertEquals(DiseaseFieldType.SINGLE, target.type(),
                                definition.slug() + "." + field.key() + " usa equals sobre " + condition.key()
                                        + ", que não é SINGLE");
                    }
                }
            }
        }
    }

    @Test
    void todaCondicaoApontaParaValorQueExisteNasOpcoesDoAlvo() {
        for (DiseaseDefinition definition : DiseaseRegistry.ALL.values()) {
            Map<String, DiseaseField> porChave = definition.fields().stream()
                    .collect(java.util.stream.Collectors.toMap(DiseaseField::key, f -> f));
            for (DiseaseField field : definition.fields()) {
                if (field.showIf() == null) continue;
                for (DiseaseField.ShowIf condition : field.showIf()) {
                    DiseaseField target = porChave.get(condition.key());
                    List<String> valores = condition.equals() != null ? condition.equals() : condition.includes();
                    for (String valor : valores) {
                        assertTrue(target.options().contains(valor),
                                definition.slug() + "." + field.key() + " espera \"" + valor + "\" em "
                                        + condition.key() + ", que não é uma opção desse campo");
                    }
                }
            }
        }
    }

    @Test
    void todoCampoSingleOuMultiTemOpcoesNaoVazias() {
        for (DiseaseDefinition definition : DiseaseRegistry.ALL.values()) {
            for (DiseaseField field : definition.fields()) {
                if (field.type() == DiseaseFieldType.SINGLE || field.type() == DiseaseFieldType.MULTI) {
                    assertNotNull(field.options(),
                            definition.slug() + "." + field.key() + " é " + field.type() + " mas options() é null");
                    assertFalse(field.options().isEmpty(),
                            definition.slug() + "." + field.key() + " é " + field.type() + " mas options() está vazio");
                }
            }
        }
    }

    @Test
    void nenhumaChaveSeRepeteDentroDaMesmaDoenca() {
        for (DiseaseDefinition definition : DiseaseRegistry.ALL.values()) {
            long unicas = definition.fields().stream().map(DiseaseField::key).distinct().count();
            assertEquals(definition.fields().size(), unicas,
                    definition.slug() + " tem chaves de campo duplicadas");
        }
    }

    private static DiseaseField campo(String slug, String key) {
        return DiseaseRegistry.getOrThrow(slug).fields().stream()
                .filter(f -> f.key().equals(key))
                .findFirst()
                .orElseThrow(() -> new AssertionError(slug + " não tem o campo " + key));
    }

    /** Toda conta lê campos que existem no mesmo modelo — senão nunca mostraria nada. */
    @Test
    void todoCampoCalculadoLeCamposDoMesmoModelo() {
        for (DiseaseDefinition definition : DiseaseRegistry.ALL.values()) {
            java.util.Set<String> keys = definition.fields().stream().map(DiseaseField::key)
                    .collect(java.util.stream.Collectors.toSet());
            definition.fields().stream()
                    .filter(f -> f.type() == DiseaseFieldType.COMPUTED)
                    .forEach(f -> f.computed().inputs().forEach(input -> assertTrue(keys.contains(input),
                            definition.slug() + "." + f.key() + " lê " + input + ", que não existe")));
        }
    }

    /** O rótulo dinâmico só troca para opções que existem no campo de origem. */
    @Test
    void rotuloDinamicoUsaOpcoesQueExistem() {
        for (DiseaseDefinition definition : DiseaseRegistry.ALL.values()) {
            for (DiseaseField field : definition.fields()) {
                if (field.dynamicLabel() == null) continue;
                DiseaseField source = definition.fields().stream()
                        .filter(f -> f.key().equals(field.dynamicLabel().key())).findFirst().orElseThrow();
                assertTrue(source.options().containsAll(field.dynamicLabel().labels().keySet()),
                        definition.slug() + "." + field.key());
            }
        }
    }

    /**
     * Gastro — Guiada: a anamnese por sintomas fica dentro de "Anamnese &
     * antecedentes", entre a HMA e os antecedentes, e os exames endoscópicos
     * logo depois de "Exames" — a ordem das fotos da cliente (13/10/2026).
     */
    @Test
    void gastroGuiadaTemSintomasDentroDaAnamneseNaOrdemPedida() {
        java.util.List<String> keys = ConsultationSectionRegistry
                .fieldsFor(MedicalRecordType.PRIMEIRA_CONSULTA, "gastro-op1").stream()
                .map(DiseaseField::key).toList();
        assertEquals("hma", keys.get(0));
        assertEquals("sintDor", keys.get(1));
        assertTrue(keys.indexOf("sintPerdaPeso") < keys.indexOf("ap"));
        assertTrue(keys.indexOf("cirurgia") < keys.indexOf("alcool"));
        assertEquals(keys.indexOf("examesAnexados") + 1, keys.indexOf("endoPrevia"));
        assertTrue(keys.indexOf("endoPrevia") < keys.indexOf("peso"));
        // Os sintomas são campos de consulta, válidos no registro desse modelo…
        ConsultationSectionRegistry.validate(MedicalRecordType.PRIMEIRA_CONSULTA, "gastro-op1",
                Map.of("sintDor", "Presente", "sintDorDetalhe", "Epigástrica"));
        // …e desconhecidos na primeira consulta de outro modelo.
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> ConsultationSectionRegistry.validate(MedicalRecordType.PRIMEIRA_CONSULTA, "drge",
                        Map.of("sintDor", "Presente")));
    }

    /**
     * MASLD (14/10/2026): cada método de estadiamento abre os seus campos, a
     * lista de causas só abre no "Não", e o quadro PREVENT é um bloco só,
     * contínuo — campos de quadro separados virariam dois quadros na tela.
     */
    @Test
    void esteatoseAbreCadaBlocoPeloMetodoEPelaResposta() {
        Map<String, DiseaseField> byKey = DiseaseRegistry.ALL.get("esteatose").fields().stream()
                .collect(java.util.stream.Collectors.toMap(DiseaseField::key, f -> f));
        java.util.function.BiFunction<String, String, List<String>> condicao = (key, alvo) ->
                byKey.get(key).showIf().stream().filter(c -> c.key().equals(alvo)).findFirst()
                        .map(c -> c.includes() != null ? c.includes() : c.equals()).orElseThrow();

        assertEquals(List.of("FIB-4"), condicao.apply("fib4Idade", "metodoEstadiamento"));
        assertEquals(List.of("FIB-4"), condicao.apply("fib4Resultado", "metodoEstadiamento"));
        assertEquals(List.of("RNM", "Fibroscan", "ARFI"), condicao.apply("elastoKpa", "metodoEstadiamento"));
        assertEquals(List.of("RNM", "Fibroscan", "ARFI"), condicao.apply("capValor", "metodoEstadiamento"));
        assertEquals(List.of("Biópsia"), condicao.apply("nasCalculado", "metodoEstadiamento"));
        assertEquals(List.of("Não"), condicao.apply("causasDescartadas", "outrasCausasDescartadas"));

        List<DiseaseField> fields = DiseaseRegistry.ALL.get("esteatose").fields();
        List<Integer> posicoes = java.util.stream.IntStream.range(0, fields.size())
                .filter(i -> fields.get(i).style() == DiseaseFieldStyle.CALCULATOR_PANEL)
                .boxed().toList();
        assertEquals(21, posicoes.size());
        assertEquals(posicoes.get(0) + 20, posicoes.get(20));
        assertTrue(posicoes.stream().allMatch(i -> fields.get(i).rowLabel() != null
                && fields.get(i).rowLabel().equals(fields.get(posicoes.get(0)).rowLabel())));
        // O resultado continua na chave de antes.
        assertTrue(fields.stream().anyMatch(f -> f.key().equals("riscoCv10")
                && f.style() == DiseaseFieldStyle.CALCULATOR_PANEL));
    }

    /** Toda conta lê campos que existem no mesmo modelo, e "Usar resultado" escreve num campo que existe. */
    @Test
    void campoCalculadoApontaParaCamposDoModelo() {
        for (DiseaseDefinition definition : DiseaseRegistry.ALL.values()) {
            Map<String, DiseaseField> byKey = definition.fields().stream()
                    .collect(java.util.stream.Collectors.toMap(DiseaseField::key, f -> f));
            for (DiseaseField field : definition.fields()) {
                if (field.type() != DiseaseFieldType.COMPUTED) continue;
                field.computed().inputs().forEach(input -> assertTrue(byKey.containsKey(input),
                        definition.slug() + "." + field.key() + " lê " + input + ", que não existe"));
                if (field.computed().applyTo() != null) {
                    assertTrue(byKey.containsKey(field.computed().applyTo()), definition.slug() + "." + field.key());
                }
            }
        }
    }

    /** Toda opção "Outros" dos pedidos de 04/11/2026 abre a caixa dela, e o valor dela é aceito. */
    @Test
    void outrosAbreCaixaParaEscrever() {
        Map<String, List<String>> pedidos = Map.of(
                "cbp", List.of("tratamento", "prurido", "saudeOssea"),
                "cep", List.of("estenoseManejo", "tratamento", "prurido", "saudeOssea"),
                "dii", List.of("tratamento"),
                "eoe", List.of("tratamento"),
                "hai", List.of("saudeOssea"));
        pedidos.forEach((slug, keys) -> keys.forEach(key -> {
            assertTrue(campo(slug, key).options().contains("Outros"), slug + "." + key);
            DiseaseField box = campo(slug, key + "Outros");
            assertTrue(box.showIf().stream().anyMatch(c -> key.equals(c.key()) && c.includes().contains("Outros")),
                    slug + "." + key);
            DiseaseRegistry.validate(slug, Map.of(key, List.of("Outros"), key + "Outros", "texto livre"));
        }));
    }

    /** A EoE é o passo a passo da cliente, nessa ordem. */
    @Test
    void eoeSegueAOrdemPedida() {
        assertEquals(List.of("criterios", "exclusao", "fenotipo", "status", "alergias", "alimentoGatilho", "edasEoe",
                        "tratamentosHist", "tratamento", "tratamentoOutros", "notas"),
                DiseaseRegistry.getOrThrow("eoe").fields().stream().map(DiseaseField::key).toList());
    }

    /** Calculado não aceita valor gravado, como o NOTE. */
    @Test
    void campoCalculadoNaoAceitaValor() {
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> DiseaseRegistry.validate("esteatose", Map.of("nasCalculado", "5")));
    }
}
