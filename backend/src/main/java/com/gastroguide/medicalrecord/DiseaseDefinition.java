package com.gastroguide.medicalrecord;

import java.util.List;

public record DiseaseDefinition(String slug, String title, String shortName, String description,
        DiseaseSpecialty specialty, List<DiseaseField> fields, boolean freeForm, int displayOrder,
        boolean retired, List<DiseaseField> consultationFields) {

    /** Vem depois dos modelos fixados no topo; entre iguais, a ordem é alfabética. */
    public static final int DEFAULT_ORDER = 100;

    /**
     * {@code freeForm} marca os modelos "em branco": o formulário de registro
     * acrescenta das seções genéricas de consulta só "Hipótese diagnóstica e
     * conduta" (e as escalas), porque a folha livre faz as vezes do resto.
     * Para todo o resto — as doenças — é falso, que é o
     * comportamento de sempre.
     *
     * <p>{@code retired} tira o modelo da lista de "Prontuários modelo" sem
     * apagá-lo: a config continua respondendo pelo slug, porque cabeçalhos e
     * registros antigos apontam para ele e o documento precisa dela para
     * imprimir.
     *
     * <p>{@code consultationFields}, quando não nulo, substitui os campos
     * genéricos de primeira consulta deste modelo (ver
     * {@link ConsultationSectionRegistry#fieldsFor(MedicalRecordType, String)}).
     */
    public DiseaseDefinition(String slug, String title, String shortName, String description,
            DiseaseSpecialty specialty, List<DiseaseField> fields) {
        this(slug, title, shortName, description, specialty, fields, false, DEFAULT_ORDER, false, null);
    }

    public DiseaseDefinition(String slug, String title, String shortName, String description,
            DiseaseSpecialty specialty, List<DiseaseField> fields, boolean freeForm) {
        this(slug, title, shortName, description, specialty, fields, freeForm, DEFAULT_ORDER, false, null);
    }

    public DiseaseDefinition(String slug, String title, String shortName, String description,
            DiseaseSpecialty specialty, List<DiseaseField> fields, boolean freeForm, int displayOrder) {
        this(slug, title, shortName, description, specialty, fields, freeForm, displayOrder, false, null);
    }

    /** O mesmo modelo, fora da lista de "Prontuários modelo". */
    public DiseaseDefinition retire() {
        return new DiseaseDefinition(slug, title, shortName, description, specialty, fields, freeForm,
                displayOrder, true, consultationFields);
    }

    /**
     * O mesmo modelo com um conjunto próprio de campos de primeira consulta
     * no lugar do genérico (a Gastro — Guiada põe a anamnese por sintomas
     * dentro de "Anamnese & antecedentes"). Nulo = conjunto genérico.
     */
    public DiseaseDefinition withConsultation(List<DiseaseField> newConsultationFields) {
        return new DiseaseDefinition(slug, title, shortName, description, specialty, fields, freeForm,
                displayOrder, retired, newConsultationFields);
    }
}
