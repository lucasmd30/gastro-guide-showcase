package com.gastroguide.medicalrecord.draft;

import com.gastroguide.patient.Patient;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Rascunho do formulário de registro, um por paciente + modelo
 * ({@code formKey}). Não tem doctor_id: o paciente já pertence a um médico, e
 * o isolamento passa por ele, como no cabeçalho de doença.
 */
@Entity
@Table(name = "medical_record_drafts")
public class MedicalRecordDraft {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(name = "form_key", nullable = false, length = 80)
    private String formKey;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> data;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected MedicalRecordDraft() {
    }

    public MedicalRecordDraft(Patient patient, String formKey, Map<String, Object> data) {
        this.patient = patient;
        this.formKey = formKey;
        this.data = data;
    }

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public String getFormKey() {
        return formKey;
    }

    public Map<String, Object> getData() {
        return data;
    }

    public void setData(Map<String, Object> data) {
        this.data = data;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
