package com.gastroguide.doctor;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Um convênio que o médico atende. A lista dele é o que o link de consulta
 * oferece ao paciente que escolhe "Convênio".
 */
@Entity
@Table(name = "doctor_health_plans")
public class DoctorHealthPlan {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected DoctorHealthPlan() {
    }

    public DoctorHealthPlan(Doctor doctor, String name) {
        this.doctor = doctor;
        this.name = name;
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

    public String getName() {
        return name;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
