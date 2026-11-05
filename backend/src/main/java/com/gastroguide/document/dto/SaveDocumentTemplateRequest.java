package com.gastroguide.document.dto;

import com.gastroguide.document.DocumentTemplateKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** {@code kind} só vale na criação: um modelo não troca de lugar depois. */
public record SaveDocumentTemplateRequest(
        @NotNull DocumentTemplateKind kind,
        @NotBlank @Size(max = 160) String name,
        @NotBlank @Size(max = 50000) String content) {
}
