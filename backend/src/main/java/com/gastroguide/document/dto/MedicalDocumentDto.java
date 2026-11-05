package com.gastroguide.document.dto;

import com.gastroguide.document.MedicalDocument;
import com.gastroguide.document.MedicalDocumentKind;

import java.time.Instant;
import java.util.Map;

/**
 * {@code signed} diz se há PDF assinado anexado; {@code signature} traz os
 * dados dele, mas só na leitura de um documento (na lista vem nulo).
 */
public record MedicalDocumentDto(String id, MedicalDocumentKind kind, String model, String title, String content,
                                 Map<String, Object> data, String crm, String crmUf, String rqe, String specialty,
                                 Instant issuedAt, String verificationCode, boolean signed,
                                 MedicalDocumentSignatureDto signature) {

    public static MedicalDocumentDto from(MedicalDocument document, boolean signed,
                                          MedicalDocumentSignatureDto signature) {
        return new MedicalDocumentDto(document.getId().toString(), document.getKind(), document.getModel(),
                document.getTitle(), document.getContent(), document.getDataJson(), document.getCrm(),
                document.getCrmUf(), document.getRqe(), document.getSpecialty(), document.getIssuedAt(),
                document.getVerificationCode(), signed, signature);
    }
}
