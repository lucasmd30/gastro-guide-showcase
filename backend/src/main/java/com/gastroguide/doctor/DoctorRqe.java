package com.gastroguide.doctor;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "doctor_rqes")
public class DoctorRqe {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(nullable = false, length = 20)
    private String rqe;

    @Column(nullable = false, length = 160)
    private String specialty;

    @Column(name = "is_principal", nullable = false)
    private boolean principal;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected DoctorRqe() {
    }

    public DoctorRqe(Doctor doctor, String rqe, String specialty, boolean principal) {
        this.doctor = doctor;
        this.rqe = rqe;
        this.specialty = specialty;
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

    public String getRqe() {
        return rqe;
    }

    public String getSpecialty() {
        return specialty;
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
