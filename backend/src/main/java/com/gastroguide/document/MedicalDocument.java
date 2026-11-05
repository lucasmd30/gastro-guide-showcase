package com.gastroguide.document;

import com.gastroguide.doctor.Doctor;
import com.gastroguide.patient.Patient;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Documento médico emitido (atestado, declaração, encaminhamento…).
 * Imutável: não há setter nem endpoint de edição ou exclusão — ver a
 * migração V27.
 */
@Entity
@Table(name = "medical_documents")
public class MedicalDocument {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MedicalDocumentKind kind;

    @Column(length = 80)
    private String model;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "data_json", columnDefinition = "jsonb")
    private Map<String, Object> dataJson;

    @Column(nullable = false, length = 20)
    private String crm;

    @Column(name = "crm_uf", nullable = false, length = 2)
    private String crmUf;

    @Column(length = 20)
    private String rqe;

    @Column(length = 150)
    private String specialty;

    @Column(name = "issued_at", nullable = false, updatable = false)
    private Instant issuedAt;

    protected MedicalDocument() {
    }

    public MedicalDocument(Patient patient, Doctor doctor, MedicalDocumentKind kind, String model, String title,
                           String content, Map<String, Object> dataJson, String crm, String crmUf, String rqe,
                           String specialty) {
        this.patient = patient;
        this.doctor = doctor;
        this.kind = kind;
        this.model = model;
        this.title = title;
        this.content = content;
        this.dataJson = dataJson;
        this.crm = crm;
        this.crmUf = crmUf;
        this.rqe = rqe;
        this.specialty = specialty;
    }

    @PrePersist
    void onCreate() {
        issuedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    /**
     * Código impresso na folha ("AB12-CD34" sem o traço). É por ele que o PDF
     * assinado anexado depois é reconhecido como sendo deste documento.
     */
    public String getVerificationCode() {
        return id.toString().replace("-", "").substring(0, 8).toUpperCase(java.util.Locale.ROOT);
    }

    public Patient getPatient() {
        return patient;
    }

    public MedicalDocumentKind getKind() {
        return kind;
    }

    public String getModel() {
        return model;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public Map<String, Object> getDataJson() {
        return dataJson;
    }

    public String getCrm() {
        return crm;
    }

    public String getCrmUf() {
        return crmUf;
    }

    public String getRqe() {
        return rqe;
    }

    public String getSpecialty() {
        return specialty;
    }

    public Instant getIssuedAt() {
        return issuedAt;
    }
}
