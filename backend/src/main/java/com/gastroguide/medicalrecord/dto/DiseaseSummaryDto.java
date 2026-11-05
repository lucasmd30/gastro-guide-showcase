package com.gastroguide.medicalrecord.dto;

import com.gastroguide.medicalrecord.DiseaseDefinition;
import com.gastroguide.medicalrecord.DiseaseSpecialty;

public record DiseaseSummaryDto(String slug, String title, String shortName, String description, DiseaseSpecialty specialty) {
    public static DiseaseSummaryDto from(DiseaseDefinition definition) {
        return new DiseaseSummaryDto(definition.slug(), definition.title(), definition.shortName(), definition.description(),
                definition.specialty());
    }
}
