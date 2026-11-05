package com.gastroguide.medicalrecord;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Mesma bateria de checagens de DiseaseRegistryTest, aplicada ao registry
 * paralelo — até esta correção (revisão final da Fase 0), ConsultationSectionRegistry
 * não tinha nenhum teste, apesar de compartilhar a mesma lógica de validação.
 */
class ConsultationSectionRegistryTest {

    @Test
    void aceitaCampoEValorValidosNaPrimeiraConsulta() {
        assertDoesNotThrow(() -> ConsultationSectionRegistry.validate(
                MedicalRecordType.PRIMEIRA_CONSULTA, Map.of("alcool", "Sim")));
    }

    @Test
    void rejeitaCampoDesconhecido() {
        assertThrows(ResponseStatusException.class,
                () -> ConsultationSectionRegistry.validate(MedicalRecordType.PRIMEIRA_CONSULTA, Map.of("campoFake", "x")));
    }

    @Test
    void rejeitaValorForaDasOpcoes() {
        assertThrows(ResponseStatusException.class,
                () -> ConsultationSectionRegistry.validate(MedicalRecordType.PRIMEIRA_CONSULTA, Map.of("alcool", "Talvez")));
    }

    @Test
    void aceitaCampoTextComQualquerString() {
        assertDoesNotThrow(() -> ConsultationSectionRegistry.validate(
                MedicalRecordType.PRIMEIRA_CONSULTA, Map.of("hma", "texto livre qualquer")));
    }

    @Test
    void aceitaCampoValidoNoRetorno() {
        assertDoesNotThrow(() -> ConsultationSectionRegistry.validate(
                MedicalRecordType.RETORNO, Map.of("queixa", "dor abdominal")));
    }

    @Test
    void aceitaCampoValidoNaEvolucao() {
        assertDoesNotThrow(() -> ConsultationSectionRegistry.validate(
                MedicalRecordType.EVOLUCAO, Map.of("evolucao", "melhora da dor", "alcool", "Sim",
                        "exAbdome", "Normal")));
    }

    @Test
    void rejeitaChaveDePrimeiraConsultaNoRetorno() {
        // "hma" só existe no conjunto de PRIMEIRA_CONSULTA.
        assertThrows(ResponseStatusException.class,
                () -> ConsultationSectionRegistry.validate(MedicalRecordType.RETORNO, Map.of("hma", "x")));
    }

    @Test
    void todoCampoSingleOuMultiTemOpcoesNaoVazias() {
        for (MedicalRecordType type : MedicalRecordType.values()) {
            for (DiseaseField field : ConsultationSectionRegistry.fieldsFor(type)) {
                if (field.type() == DiseaseFieldType.SINGLE || field.type() == DiseaseFieldType.MULTI) {
                    assertNotNull(field.options(),
                            type + "." + field.key() + " é " + field.type() + " mas options() é null");
                    assertFalse(field.options().isEmpty(),
                            type + "." + field.key() + " é " + field.type() + " mas options() está vazio");
                }
            }
        }
    }

    /*
     * Agrupamento do protótipo: a primeira consulta tem 3 cards
     * ("Anamnese & antecedentes", "Exame físico", "Hipótese diagnóstica e
     * conduta"), com hábitos,
     * suplementos e antropometria como subtítulos dentro do primeiro.
     */
    @Test
    void primeiraConsultaTemAsTresSecoesDoProtótipo() {
        List<String> secoes = ConsultationSectionRegistry.fieldsFor(MedicalRecordType.PRIMEIRA_CONSULTA).stream()
                .map(DiseaseField::section)
                .distinct()
                .toList();
        assertEquals(List.of("Anamnese & antecedentes", "Exame físico", "Hipótese diagnóstica e conduta"),
                secoes);
    }

    @Test
    void habitosSuplementosEAntropometriaSaoSubsecoesDaAnamnese() {
        for (DiseaseField field : ConsultationSectionRegistry.fieldsFor(MedicalRecordType.PRIMEIRA_CONSULTA)) {
            if (field.subsection() != null) {
                assertEquals("Anamnese & antecedentes", field.section(),
                        field.key() + " tem subseção mas não está no card de anamnese");
            }
        }
        List<String> subsecoes = ConsultationSectionRegistry.fieldsFor(MedicalRecordType.PRIMEIRA_CONSULTA).stream()
                .map(DiseaseField::subsection)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        assertEquals(List.of("Hábitos", ConsultationSectionRegistry.SUPLEMENTOS, "Antropometria"), subsecoes);
    }

    /** Cada região do exame físico é um par: o modo e o campo de achados que o acompanha. */
    @Test
    void cadaModoDeExameFisicoTemSeuCampoDeAchados() {
        List<DiseaseField> fields = ConsultationSectionRegistry.fieldsFor(MedicalRecordType.PRIMEIRA_CONSULTA);
        long modos = fields.stream().filter(f -> f.style() == DiseaseFieldStyle.EXAM_MODE).count();
        long achados = fields.stream().filter(f -> f.style() == DiseaseFieldStyle.EXAM_FINDINGS).count();
        assertEquals(7, modos);
        assertEquals(modos, achados);

        for (DiseaseField field : fields) {
            if (field.style() != DiseaseFieldStyle.EXAM_FINDINGS) continue;
            assertNotNull(field.placeholder(), field.key() + " precisa da frase padrão da região no placeholder");
            assertNotNull(field.showIf(), field.key() + " precisa depender do modo da região");
            assertEquals(List.of("Normal", "Alterado"), field.showIf().get(0).equals());
        }
    }

    @Test
    void retornoTemOsNoveCamposDoProtótipoMaisSinaisVitais() {
        List<String> chaves = ConsultationSectionRegistry.fieldsFor(MedicalRecordType.RETORNO).stream()
                .map(DiseaseField::key)
                .toList();
        assertEquals(List.of("queixa", "evolucao", "adesao", "alergia", "habito", "pa", "fc", "fr", "satO2",
                "exameFisico", "novosExames", "hipotese", "conduta"), chaves);
    }

    /** Hipótese e conduta do retorno ficam no card próprio, depois das escalas (14/10/2026). */
    @Test
    void retornoTemHipoteseECondutaNoCardProprio() {
        List<DiseaseField> fields = ConsultationSectionRegistry.fieldsFor(MedicalRecordType.RETORNO);
        assertEquals(List.of("hipotese", "conduta"), fields.stream()
                .filter(f -> "Hipótese diagnóstica e conduta".equals(f.section()))
                .map(DiseaseField::key)
                .toList());
        // O resto continua sem seção: é o card "Retorno".
        assertEquals(11, fields.stream().filter(f -> f.section() == null).count());
    }

    /*
     * Evolução (14/10/2026): card "Evolução", o exame físico da consulta e
     * "Hipótese diagnóstica e conduta" — as escalas entram entre os dois
     * últimos, na tela.
     */
    @Test
    void evolucaoTemOsTresCardsDeCampos() {
        List<DiseaseField> fields = ConsultationSectionRegistry.fieldsFor(MedicalRecordType.EVOLUCAO);
        assertEquals(List.of("Evolução", "Exame físico", "Hipótese diagnóstica e conduta"),
                fields.stream().map(DiseaseField::section).distinct().toList());
        assertEquals(List.of("evolucao", "med"), fields.subList(0, 2).stream().map(DiseaseField::key).toList());
        assertEquals("Nega", fields.get(1).quickFill());
        assertEquals(List.of("Hábitos", ConsultationSectionRegistry.SUPLEMENTOS, "Antropometria"),
                fields.stream().map(DiseaseField::subsection).filter(java.util.Objects::nonNull).distinct()
                        .toList());
        // "Exames" vem logo antes da antropometria, como na consulta.
        List<String> chaves = fields.stream().map(DiseaseField::key).toList();
        assertEquals(chaves.indexOf("peso") - 1, chaves.indexOf("examesAnexados"));
    }

    @Test
    void evolucaoNaoTemMaisOsCamposDoRetorno() {
        assertThrows(ResponseStatusException.class, () -> ConsultationSectionRegistry.validate(
                MedicalRecordType.EVOLUCAO, Map.of("queixa", "x")));
    }

    @Test
    void antecedentesTemOAtalhoNegaComoNoPrototipo() {
        List<String> comNega = ConsultationSectionRegistry.fieldsFor(MedicalRecordType.PRIMEIRA_CONSULTA).stream()
                .filter(f -> "Nega".equals(f.quickFill()))
                .map(DiseaseField::key)
                .toList();
        assertEquals(List.of("ap", "internacao", "med", "alergia", "af", "cirurgia"), comNega);
    }

    @Test
    void sinaisVitaisAbremOExameFisicoNumaLinhaSo() {
        List<DiseaseField> exame = ConsultationSectionRegistry.fieldsFor(MedicalRecordType.PRIMEIRA_CONSULTA)
                .stream()
                .filter(f -> "Exame físico".equals(f.section()))
                .toList();
        assertEquals(List.of("pa", "fc", "fr", "satO2"),
                exame.subList(0, 4).stream().map(DiseaseField::key).toList());
        exame.subList(0, 4).forEach(f -> assertEquals("Sinais vitais", f.rowLabel()));
        assertDoesNotThrow(() -> ConsultationSectionRegistry.validate(MedicalRecordType.PRIMEIRA_CONSULTA,
                Map.of("pa", "120/80", "fc", "72", "fr", "16", "satO2", "98")));
    }

    @Test
    void nenhumaChaveDeCampoSeRepeteDentroDoMesmoTipo() {
        for (MedicalRecordType type : MedicalRecordType.values()) {
            List<DiseaseField> fields = ConsultationSectionRegistry.fieldsFor(type);
            long chavesUnicas = fields.stream().map(DiseaseField::key).distinct().count();
            assertEquals(fields.size(), chavesUnicas, type + " tem chaves de campo duplicadas");
        }
    }
}
