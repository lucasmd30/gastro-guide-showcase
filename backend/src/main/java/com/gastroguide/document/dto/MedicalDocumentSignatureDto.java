package com.gastroguide.document.dto;

import com.gastroguide.document.signature.MedicalDocumentSignatureRepository.SignatureInfo;
import com.gastroguide.document.signature.SignatureLevel;

import java.time.Instant;

public record MedicalDocumentSignatureDto(String fileName, String signerName, String signerCpf, String issuer,
                                          SignatureLevel level, Instant signedAt, int signatureCount,
                                          boolean coversDocument, Instant uploadedAt) {

    public static MedicalDocumentSignatureDto from(SignatureInfo info) {
        return new MedicalDocumentSignatureDto(info.getFileName(), info.getSignerName(), info.getSignerCpf(),
                info.getIssuer(), info.getLevel(), info.getSignedAt(), info.getSignatureCount(),
                info.getCoversDocument(), info.getUploadedAt());
    }
}
