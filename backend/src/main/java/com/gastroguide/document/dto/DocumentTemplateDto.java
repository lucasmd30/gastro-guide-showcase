package com.gastroguide.document.dto;

import com.gastroguide.document.DocumentTemplate;
import com.gastroguide.document.DocumentTemplateKind;

import java.time.Instant;

public record DocumentTemplateDto(String id, DocumentTemplateKind kind, String name, String content,
                                  Instant updatedAt) {

    public static DocumentTemplateDto from(DocumentTemplate template) {
        return new DocumentTemplateDto(template.getId().toString(), template.getKind(), template.getName(),
                template.getContent(), template.getUpdatedAt());
    }
}
