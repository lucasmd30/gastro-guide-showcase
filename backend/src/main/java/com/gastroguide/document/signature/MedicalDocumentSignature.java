package com.gastroguide.document.signature;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * O PDF assinado anexado a um documento emitido (migração V29), com o que a
 * conferência leu da assinatura. Um por documento: anexar de novo substitui.
 */
@Entity
@Table(name = "medical_document_signatures")
public class MedicalDocumentSignature {

    @Id
    @Column(name = "document_id")
    private UUID documentId;

    @Column(nullable = false, columnDefinition = "bytea")
    private byte[] pdf;

    @Column(name = "file_name", length = 200)
    private String fileName;

    @Column(nullable = false, length = 64)
    private String sha256;

    @Column(name = "signer_name", length = 200)
    private String signerName;

    @Column(name = "signer_cpf", length = 11)
    private String signerCpf;

    @Column(length = 400)
    private String issuer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SignatureLevel level;

    @Column(name = "signed_at")
    private Instant signedAt;

    @Column(name = "signature_count", nullable = false)
    private int signatureCount;

    @Column(name = "covers_document", nullable = false)
    private boolean coversDocument;

    @Column(name = "uploaded_at", nullable = false)
    private Instant uploadedAt;

    protected MedicalDocumentSignature() {
    }

    public MedicalDocumentSignature(UUID documentId) {
        this.documentId = documentId;
    }

    public void replace(byte[] pdf, String fileName, String sha256, SignatureInspection inspection) {
        this.pdf = pdf;
        this.fileName = fileName;
        this.sha256 = sha256;
        this.signerName = truncate(inspection.signerName(), 200);
        this.signerCpf = inspection.signerCpf();
        this.issuer = truncate(inspection.issuer(), 400);
        this.level = inspection.level();
        this.signedAt = inspection.signedAt();
        this.signatureCount = inspection.signatureCount();
        this.coversDocument = inspection.coversDocument();
        this.uploadedAt = Instant.now();
    }

    private static String truncate(String value, int max) {
        return value == null || value.length() <= max ? value : value.substring(0, max);
    }

    public UUID getDocumentId() {
        return documentId;
    }

    public byte[] getPdf() {
        return pdf;
    }

    public String getFileName() {
        return fileName;
    }

    public String getSha256() {
        return sha256;
    }

    public String getSignerName() {
        return signerName;
    }

    public String getSignerCpf() {
        return signerCpf;
    }

    public String getIssuer() {
        return issuer;
    }

    public SignatureLevel getLevel() {
        return level;
    }

    public Instant getSignedAt() {
        return signedAt;
    }

    public int getSignatureCount() {
        return signatureCount;
    }

    public boolean isCoversDocument() {
        return coversDocument;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }
}
