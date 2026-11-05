package com.gastroguide.common;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Um campo não preenchido chega aqui como null, "" ou [] dependendo do tipo
 * (SINGLE/TEXT/MULTI) e de qual cliente enviou o payload — trata os três
 * como "não informado" e remove antes de validar/persistir, em vez de
 * deixar cada tipo se comportar de um jeito diferente. Usado tanto pelo
 * cabeçalho de doença (PatientDiseaseHeaderService) quanto pelas seções de
 * consulta (MedicalRecordService).
 */
public final class FormDataNormalizer {

    private FormDataNormalizer() {
    }

    public static Map<String, Object> normalize(Map<String, Object> data) {
        Map<String, Object> normalized = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : data.entrySet()) {
            Object value = entry.getValue();
            if (value == null) {
                continue;
            }
            if (value instanceof String str && str.isBlank()) {
                continue;
            }
            if (value instanceof List<?> list && list.isEmpty()) {
                continue;
            }
            normalized.put(entry.getKey(), value);
        }
        return normalized;
    }
}
