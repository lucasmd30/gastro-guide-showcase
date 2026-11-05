package com.gastroguide.doctor;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "doctor_crms")
public class DoctorCrm {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(nullable = false, length = 20)
    private String crm;

    @Column(name = "crm_uf", nullable = false, length = 2)
    private String crmUf;

    @Column(name = "is_principal", nullable = false)
    private boolean principal;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected DoctorCrm() {
    }

    public DoctorCrm(Doctor doctor, String crm, String crmUf, boolean principal) {
        this.doctor = doctor;
        this.crm = crm;
        this.crmUf = crmUf;
        this.principal = principal;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public Doctor getDoctor() {
        return doctor;
    }

    public String getCrm() {
        return crm;
    }

    public String getCrmUf() {
        return crmUf;
    }

    public boolean isPrincipal() {
        return principal;
    }

    public void setPrincipal(boolean principal) {
        this.principal = principal;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
