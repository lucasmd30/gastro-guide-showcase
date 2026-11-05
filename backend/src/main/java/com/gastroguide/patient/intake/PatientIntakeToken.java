package com.gastroguide.patient.intake;

import com.gastroguide.appointment.AppointmentType;
import com.gastroguide.doctor.Doctor;
import com.gastroguide.patient.Patient;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Link público de uso único. Pertence ao <b>médico</b>, não ao paciente: é
 * o que permite gerá-lo antes de existir cadastro. O paciente só é
 * associado quando o link é gerado a partir de um cadastro que já existe,
 * ou quando o próprio paciente se cadastra por ele.
 */
@Entity
@Table(name = "patient_intake_tokens")
public class PatientIntakeToken {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id")
    private Patient patient;

    /** Nulo até o paciente escolher entre primeira consulta e retorno no link — ver V14. */
    @Enumerated(EnumType.STRING)
    @Column(name = "appointment_type", length = 20)
    private AppointmentType appointmentType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private IntakeLinkPurpose purpose;

    @Column(name = "token_hash", nullable = false, unique = true, length = 100)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected PatientIntakeToken() {
    }

    public PatientIntakeToken(Doctor doctor, Patient patient, AppointmentType appointmentType,
            IntakeLinkPurpose purpose, String tokenHash, Instant expiresAt) {
        this.doctor = doctor;
        this.patient = patient;
        this.appointmentType = appointmentType;
        this.purpose = purpose;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public boolean isExpired() {
        return expiresAt.isBefore(Instant.now());
    }

    public void revoke() {
        this.revokedAt = Instant.now();
    }

    /** Preenchido quando o paciente se cadastra pelo próprio link. */
    public void attachPatient(Patient newPatient) {
        this.patient = newPatient;
    }

    public UUID getId() {
        return id;
    }

    public Doctor getDoctor() {
        return doctor;
    }

    public Patient getPatient() {
        return patient;
    }

    public AppointmentType getAppointmentType() {
        return appointmentType;
    }

    public IntakeLinkPurpose getPurpose() {
        return purpose;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }
}
