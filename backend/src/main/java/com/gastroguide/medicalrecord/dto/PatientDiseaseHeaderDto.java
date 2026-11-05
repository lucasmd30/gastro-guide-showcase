package com.gastroguide.medicalrecord.dto;

import com.gastroguide.medicalrecord.PatientDiseaseHeader;

import java.time.Instant;
import java.util.Map;

public record PatientDiseaseHeaderDto(String disease, Map<String, Object> data, Instant updatedAt) {
    public static PatientDiseaseHeaderDto from(PatientDiseaseHeader header) {
        return new PatientDiseaseHeaderDto(header.getDisease(), header.getData(), header.getUpdatedAt());
    }
}
