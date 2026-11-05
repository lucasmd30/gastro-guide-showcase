package com.gastroguide.medicalrecord.dto;

import com.gastroguide.medicalrecord.MedicalRecordType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record CreateMedicalRecordRequest(
        @NotNull MedicalRecordType type,
        String disease,
        @NotBlank @Size(max = 200) String title,
        String contentText,
        @NotNull UUID crmId,
        UUID rqeId,
        Map<String, Object> consultationData,
        /* Escalas já formatadas pelo frontend — ver o comentário da migração V15. */
        List<@NotBlank @Size(max = 300) String> scores) {
}
