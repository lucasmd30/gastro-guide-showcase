package com.gastroguide.document.dto;

import com.gastroguide.document.MedicalDocumentKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;
import java.util.UUID;

public record CreateMedicalDocumentRequest(
        @NotNull MedicalDocumentKind kind,
        @Size(max = 80) String model,
        @NotBlank @Size(max = 200) String title,
        /* As orientações prontas mais longas têm ~5 mil caracteres; folga para o médico completar. */
        @NotBlank @Size(max = 50000) String content,
        Map<String, @Size(max = 5000) String> data,
        @NotNull UUID crmId,
        UUID rqeId) {
}
