package com.gastroguide.appointment;

import com.gastroguide.doctor.Doctor;
import com.gastroguide.patient.Patient;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "appointments")
public class Appointment {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Column(name = "duration_min", nullable = false)
    private int durationMin;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AppointmentType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AppointmentModality modality;

    /** Nulo = não informado (consulta marcada pelo paciente no link). */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private AppointmentBilling billing;

    /** Valor cobrado, em centavos — só existe quando {@link #billing} é particular (V25). */
    @Column(name = "price_cents")
    private Integer priceCents;

    /** Só existe quando {@link #billing} é convênio. */
    @Column(name = "health_plan", length = 120)
    private String healthPlan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AppointmentStatus status;

    @Column(columnDefinition = "text")
    private String notes;

    /** Marcado de propósito num horário que já tinha outro paciente. */
    @Column(nullable = false)
    private boolean encaixe;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Appointment() {
    }

    public Appointment(Doctor doctor, Patient patient, Instant scheduledAt, int durationMin,
                        AppointmentType type, AppointmentModality modality, String notes) {
        this.doctor = doctor;
        this.patient = patient;
        this.scheduledAt = scheduledAt;
        this.durationMin = durationMin;
        this.type = type;
        this.modality = modality;
        this.status = AppointmentStatus.AGENDADO;
        this.notes = notes;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
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

    public Instant getScheduledAt() {
        return scheduledAt;
    }

    public void setScheduledAt(Instant scheduledAt) {
        this.scheduledAt = scheduledAt;
    }

    public int getDurationMin() {
        return durationMin;
    }

    public AppointmentType getType() {
        return type;
    }

    public void setType(AppointmentType type) {
        this.type = type;
    }

    public AppointmentModality getModality() {
        return modality;
    }

    public void setModality(AppointmentModality modality) {
        this.modality = modality;
    }

    public AppointmentBilling getBilling() {
        return billing;
    }

    public String getHealthPlan() {
        return healthPlan;
    }

    /**
     * Contratação, plano e valor andam juntos: o plano só vale para convênio
     * e o valor só para particular (há um CHECK no banco para cada um).
     */
    public void setBilling(AppointmentBilling billing, String healthPlan, Integer priceCents) {
        this.billing = billing;
        this.healthPlan = billing == AppointmentBilling.CONVENIO ? healthPlan : null;
        this.priceCents = billing == AppointmentBilling.PARTICULAR ? priceCents : null;
    }

    public Integer getPriceCents() {
        return priceCents;
    }

    public AppointmentStatus getStatus() {
        return status;
    }

    public void setStatus(AppointmentStatus status) {
        this.status = status;
    }

    public boolean isEncaixe() {
        return encaixe;
    }

    public void setEncaixe(boolean encaixe) {
        this.encaixe = encaixe;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
