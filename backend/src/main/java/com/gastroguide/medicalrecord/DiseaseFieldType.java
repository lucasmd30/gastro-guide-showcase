package com.gastroguide.medicalrecord;

public enum DiseaseFieldType {
    SINGLE, MULTI, TEXT, NUMBER, TABLE, LINKS, NOTE,
    /** Valor calculado de outros campos (FIB-4, NAS). Somente leitura e nunca gravado, como o NOTE. */
    COMPUTED
}
