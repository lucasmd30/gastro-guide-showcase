package com.gastroguide.medicalrecord.dto;

import com.gastroguide.medicalrecord.DiseaseDefinition;
import com.gastroguide.medicalrecord.DiseaseRegistry;
import com.gastroguide.medicalrecord.MedicalRecord;
import com.gastroguide.medicalrecord.MedicalRecordType;

import java.time.Instant;
import java.util.Map;

/**
 * Uma linha do histórico do paciente. Além do que identifica o registro,
 * leva um resumo curto para os cards do "Histórico de consultas" (pedido de
 * 09/10/2026): a hipótese e a conduta daquele dia, ou, quando o registro não
 * tem essas duas (retorno sem hipótese, folha livre), um trecho do que foi
 * escrito. Os trechos são cortados aqui para a lista não carregar o
 * prontuário inteiro de cada consulta — o registro completo é o documento.
 *
 * @param diseaseName nome curto do modelo ("DRGE", "Em branco"), nulo no registro "Geral"
 * @param scoreCount  quantas escalas foram anexadas
 * @param crm         CRM congelado no registro ("12345/SP"), nulo em registros antigos
 */
public record MedicalRecordSummaryDto(String id, MedicalRecordType type, String disease, String title,
        Instant createdAt, String diseaseName, String hypothesis, String conduct, String excerpt,
        int scoreCount, String crm) {

    private static final int EXCERPT_CHARS = 180;

    public static MedicalRecordSummaryDto from(MedicalRecord record) {
        Map<String, Object> consultation = record.getConsultationJson() == null ? Map.of()
                : record.getConsultationJson();
        Map<String, Object> header = record.getContentJson() == null ? Map.of() : record.getContentJson();

        String hypothesis = text(consultation.get("hipotese"));
        String conduct = text(consultation.get("conduta"));
        // Sem hipótese nem conduta, o que mais diz sobre a consulta: a queixa
        // do retorno, a HMA da consulta, a evolução (que não tem queixa), ou
        // a anotação da folha livre (que fica no cabeçalho do modelo, não nas
        // seções de consulta).
        String excerpt = hypothesis == null && conduct == null
                ? firstText(consultation.get("queixa"), consultation.get("hma"), consultation.get("evolucao"),
                        header.get("texto"), record.getContentText())
                : null;

        DiseaseDefinition disease = record.getDisease() == null ? null : DiseaseRegistry.ALL.get(record.getDisease());
        String crm = record.getCrm() == null ? null
                : record.getCrm() + (record.getCrmUf() == null ? "" : "/" + record.getCrmUf());

        return new MedicalRecordSummaryDto(
                record.getId().toString(), record.getType(), record.getDisease(), record.getTitle(),
                record.getCreatedAt(), disease == null ? record.getDisease() : disease.shortName(),
                hypothesis, conduct, excerpt,
                record.getScoresJson() == null ? 0 : record.getScoresJson().size(), crm);
    }

    private static String firstText(Object... values) {
        for (Object value : values) {
            String text = text(value);
            if (text != null) return text;
        }
        return null;
    }

    /** Texto aparado e cortado, ou nulo quando não há nada (inclusive campo que não é texto). */
    private static String text(Object value) {
        if (!(value instanceof String s)) return null;
        String trimmed = s.strip().replaceAll("\s+", " ");
        if (trimmed.isEmpty()) return null;
        return trimmed.length() <= EXCERPT_CHARS ? trimmed : trimmed.substring(0, EXCERPT_CHARS).stripTrailing() + "…";
    }
}
