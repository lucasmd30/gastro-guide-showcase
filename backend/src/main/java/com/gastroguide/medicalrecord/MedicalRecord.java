package com.gastroguide.medicalrecord;

import com.gastroguide.doctor.Doctor;
import com.gastroguide.patient.Patient;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "medical_records")
public class MedicalRecord {

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
    private MedicalRecordType type;

    @Column(length = 40)
    private String disease;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 20)
    private String crm;

    @Column(name = "crm_uf", length = 2)
    private String crmUf;

    @Column(length = 20)
    private String rqe;

    @Column(length = 150)
    private String specialty;

    @Column(name = "content_text", nullable = false, columnDefinition = "text")
    private String contentText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "content_json", columnDefinition = "jsonb")
    private Map<String, Object> contentJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "consultation_json", columnDefinition = "jsonb")
    private Map<String, Object> consultationJson;

    /**
     * Escalas e calculadoras do atendimento, já formatadas ("FIB-4: 2,10
     * (indeterminado)"). Guarda o resultado, e não as entradas da conta — ver
     * o comentário da migração V15.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "scores_json", columnDefinition = "jsonb")
    private List<String> scoresJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected MedicalRecord() {
    }

    public MedicalRecord(Patient patient, Doctor doctor, MedicalRecordType type, String disease,
                          String title, String crm, String crmUf, String rqe, String specialty,
                          String contentText, Map<String, Object> contentJson,
                          Map<String, Object> consultationJson, List<String> scoresJson) {
        this.patient = patient;
        this.doctor = doctor;
        this.type = type;
        this.disease = disease;
        this.title = title;
        this.crm = crm;
        this.crmUf = crmUf;
        this.rqe = rqe;
        this.specialty = specialty;
        this.contentText = contentText;
        this.contentJson = contentJson;
        this.consultationJson = consultationJson;
        this.scoresJson = scoresJson;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public Patient getPatient() {
        return patient;
    }

    public Doctor getDoctor() {
        return doctor;
    }

    public MedicalRecordType getType() {
        return type;
    }

    public String getDisease() {
        return disease;
    }

    public String getTitle() {
        return title;
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

    public String getContentText() {
        return contentText;
    }

    public Map<String, Object> getContentJson() {
        return contentJson;
    }

    public List<String> getScoresJson() {
        return scoresJson;
    }

    public Map<String, Object> getConsultationJson() {
        return consultationJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
